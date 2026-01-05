import assert from 'node:assert'

import type { APIEmbed, ApplicationEmoji, Message, TextBasedChannelFields, Webhook } from 'discord.js'
import { AttachmentBuilder, ChannelType as DiscordChannelType, escapeMarkdown, hyperlink } from 'discord.js'
import type { Logger } from 'log4js'

import type { StaticDiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type {
  BaseEvent,
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceReactive,
  InstanceReactiveType,
  InstanceStatus,
  MinecraftReactiveEvent
} from '../../common/application-event.js'
import {
  ChannelType,
  Color,
  ContentType,
  GuildPlayerEventType,
  InstanceType,
  MinecraftReactiveEventType,
  PunishmentPurpose,
  PunishmentType
} from '../../common/application-event.js'
import Bridge from '../../common/bridge.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { User } from '../../common/user'
import MinecraftRenderer from '../../utility/minecraft-renderer'
import { beautifyInstanceName } from '../../utility/shared-utility'

import { BlockReaction, GuildMutedReaction, RepeatReaction } from './common/discord-config.js'
import { InstanceStatusManager } from './common/instance-status-manager'
import type MessageAssociation from './common/message-association.js'
import type { DiscordAssociatedMessage } from './common/message-association.js'
import MessageDeleter from './common/message-deletor.js'
import type DiscordInstance from './discord-instance.js'

export default class DiscordBridge extends Bridge<DiscordInstance> {
  public readonly messageDeleter: MessageDeleter
  private readonly messageAssociation: MessageAssociation

  private readonly instanceStatusManager: InstanceStatusManager

  private readonly staticConfig: Readonly<StaticDiscordConfig>

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    messageAssociation: MessageAssociation,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    staticDiscordConfig: StaticDiscordConfig
  ) {
    super(application, clientInstance, logger, errorHandler)

    this.messageAssociation = messageAssociation
    this.staticConfig = staticDiscordConfig

    this.messageDeleter = new MessageDeleter(application, errorHandler, this.clientInstance.getClient())
    this.instanceStatusManager = new InstanceStatusManager(
      this.application,
      this.clientInstance,
      this.messageAssociation,
      this.errorHandler
    )

    this.application.on('instanceReactive', async (event) => {
      await this.queue
        .add(async () => this.onInstanceReactiveEvent(event))
        .catch(this.errorHandler.promiseCatch('handling event instanceReactive'))
    })
  }

  async onInstance(event: InstanceStatus): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    switch (event.instanceType) {
      case InstanceType.Main:
      case InstanceType.Commands:
      case InstanceType.Prometheus:
      case InstanceType.Metrics:
      case InstanceType.Plugin:
      case InstanceType.Utility:
      case InstanceType.Core: {
        return
      }
    }

    await this.instanceStatusManager.send(event)
  }

  async onChat(event: ChatEvent): Promise<void> {
    const channels = this.resolveChannels([event.channelType])
    const username = event.user.displayName()

    for (const channelId of channels) {
      if (event.instanceType === InstanceType.Discord && channelId === event.channelId) continue

      if (
        event.instanceType === InstanceType.Minecraft &&
        this.minecraftRenderImageEnabled() &&
        MinecraftRenderer.renderSupported()
      ) {
        const formattedMessage = this.removeGuildPrefix(event.rawMessage)
        const image = MinecraftRenderer.generateMessageImage(formattedMessage)
        await this.sendImageToChannels(event.eventId, [channelId], [image])
      } else {
        const webhook = await this.getWebhook(channelId)

        let displayUsername =
          event.instanceType === InstanceType.Discord && event.replyUsername !== undefined
            ? `${username}⇾${event.replyUsername}`
            : username

        if (this.application.core.applicationConfigurations.getOriginTag()) {
          displayUsername += event.instanceType === InstanceType.Discord ? ` [DC]` : ` [${event.instanceName}]`
        }

        const message = await webhook.send({
          content: escapeMarkdown(event.message),
          username: displayUsername,
          avatarURL: event.user.avatar(),
          allowedMentions: { parse: [] }
        })
        this.messageAssociation.addMessageId(event.eventId, {
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id
        })
      }
    }
  }

  async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return

    const config = this.application.core.discordConfigurations
    if (event.type === GuildPlayerEventType.Online && !config.getGuildOnline()) return
    if (event.type === GuildPlayerEventType.Offline && !config.getGuildOffline()) return

    if (event.type === GuildPlayerEventType.Mute) {
      const game =
        event.user
          .punishments()
          .all()
          .filter((punishment) => punishment.type === PunishmentType.Mute)
          .toSorted((a, b) => b.createdAt - a.createdAt)
          .at(0)?.purpose === PunishmentPurpose.Game

      if (game) return
    }

    const removeLater = event.type === GuildPlayerEventType.Offline || event.type === GuildPlayerEventType.Online

    const username = event.user.displayName()
    const clickableUsername = hyperlink(username, event.user.profileLink())
    const withoutPrefix = event.message.replaceAll(/^-+/g, '').replaceAll('Guild > ', '')
    const newMessage = `**${escapeMarkdown(event.instanceName)} >** ${escapeMarkdown(withoutPrefix).replaceAll(escapeMarkdown(username), clickableUsername)}`
    const embed = {
      url: event.user.profileLink(),
      description: newMessage,
      color: event.color
    } satisfies APIEmbed

    const messages: Message[] = []
    if (this.minecraftRenderImageEnabled() && MinecraftRenderer.renderSupported()) {
      const formattedMessage = this.removeGuildPrefix(event.rawMessage)

      const sentMessages = await this.sendImageToChannels(event.eventId, this.resolveChannels(event.channels), [
        MinecraftRenderer.generateMessageImage(formattedMessage)
      ])
      messages.push(...sentMessages)
    } else {
      const sentMessages = await this.sendEmbedToChannels(
        { ...event, type: undefined },
        this.resolveChannels(event.channels),
        embed
      )
      messages.push(...sentMessages)
    }

    if (!removeLater) {
      const logMessages = await this.sendEmbedToChannels(
        { ...event, type: undefined },
        config.getLoggerChannelIds(),
        embed
      )
      messages.push(...logMessages)
    }

    if (removeLater) {
      const currentTime = Date.now()
      const entries = messages.map((message) => ({
        channelId: message.channelId,
        messageId: message.id,
        createdAt: currentTime
      }))
      await this.messageDeleter.add(entries)
    }
  }

  async onGuildGeneral(event: GuildGeneralEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return

    if (this.minecraftRenderImageEnabled() && MinecraftRenderer.renderSupported()) {
      const image = MinecraftRenderer.generateMessageImage(event.rawMessage)
      await this.sendImageToChannels(event.eventId, this.resolveChannels(event.channels), [image])
    } else {
      await this.sendEmbedToChannels({ ...event, type: undefined }, this.resolveChannels(event.channels), undefined)
    }
  }

  private lastMinecraftEvent = new Map<MinecraftReactiveEventType, number>()

  async onMinecraftChatEvent(event: MinecraftReactiveEvent): Promise<void> {
    if ((this.lastMinecraftEvent.get(event.type) ?? 0) + 5000 > Date.now()) return
    this.lastMinecraftEvent.set(event.type, Date.now())

    const client = this.clientInstance.getClient()

    const replyIds = this.messageAssociation.getMessageId(event.originEventId)
    for (const replyId of replyIds) {
      try {
        const channel = await client.channels.fetch(replyId.channelId)
        if (channel?.type === DiscordChannelType.GuildText) {
          const message = await channel.messages.fetch(replyId.messageId)

          let emoji: ApplicationEmoji | undefined = undefined
          switch (event.type) {
            case MinecraftReactiveEventType.Repeat: {
              emoji = client.application?.emojis.cache.find((emoji) => emoji.name === RepeatReaction.name)
              break
            }
            case MinecraftReactiveEventType.Advertise:
            case MinecraftReactiveEventType.Block: {
              emoji = client.application?.emojis.cache.find((emoji) => emoji.name === BlockReaction.name)
              break
            }
            case MinecraftReactiveEventType.GuildMuted: {
              emoji = client.application?.emojis.cache.find((emoji) => emoji.name === GuildMutedReaction.name)
              break
            }
          }

          if (emoji != undefined) {
            await message.react(emoji)
            continue
          }
        }

        if (this.minecraftRenderImageEnabled() && MinecraftRenderer.renderSupported()) {
          assert.ok(channel?.isSendable())
          await channel.send({
            files: [new AttachmentBuilder(MinecraftRenderer.generateMessageImage(event.rawMessage))]
          })
        } else {
          await this.reply(event.eventId, replyId, await this.generateEmbed(event, replyId.guildId))
        }
      } catch (error: unknown) {
        this.logger.error(error, 'can not reply to message')
      }
    }
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return

    const channels = this.resolveChannels(event.channels)
    if (this.minecraftRenderImageEnabled() && MinecraftRenderer.renderSupported()) {
      let formatted: string
      switch (event.color) {
        case Color.Good: {
          formatted = `§a`
          break
        }
        case Color.Bad: {
          formatted = `§c`
          break
        }
        case Color.Error: {
          formatted = `§4`
          break
        }
        case Color.Info: {
          formatted = `§e`
          break
        }
        // eslint-disable-next-line unicorn/no-useless-switch-case
        case Color.Default:
        default: {
          formatted = `§b`
        }
      }
      const image = MinecraftRenderer.generateMessageImage(formatted + event.message)
      await this.sendImageToChannels(event.eventId, channels, [image])
    } else {
      await this.sendEmbedToChannels(event, channels, undefined)
    }
  }

  private formatRenderedImage(prefix: string, message: string): string {
    return `§4§l[§c${prefix}§4§l]§f§r ${message}`
  }

  private resolveChannels(channels: ChannelType[]): string[] {
    const config = this.application.core.discordConfigurations

    const results: string[] = []
    if (channels.includes(ChannelType.Public)) results.push(...config.getPublicChannelIds())
    if (channels.includes(ChannelType.Officer)) results.push(...config.getOfficerChannelIds())

    return results
  }

  async onCommand(event: CommandEvent): Promise<void> {
    await this.sendCommandResponse(event, false)
  }

  async onCommandFeedback(event: CommandFeedbackEvent): Promise<void> {
    await this.sendCommandResponse(event, true)
  }

  private lastInstanceReactiveEvent = new Map<InstanceReactiveType, number>()

  async onInstanceReactiveEvent(event: InstanceReactive): Promise<void> {
    if ((this.lastInstanceReactiveEvent.get(event.type) ?? 0) + 5000 > Date.now()) return
    this.lastInstanceReactiveEvent.set(event.type, Date.now())

    const replyIds = this.messageAssociation.getMessageId(event.originEventId)

    for (const replyId of replyIds) {
      try {
        await this.reply(
          event.eventId,
          replyId,
          await this.generateEmbed({ ...event, type: undefined }, replyId.guildId)
        )
      } catch (error: unknown) {
        this.logger.error(error, 'can not reply to message. sending the event independently')
        await this.sendEmbedToChannels({ ...event, type: undefined }, [replyId.channelId], undefined)
      }
    }
  }

  private removeGuildPrefix(message: string): string {
    const prefixes = ['§2Guild > ', '§3Officer > ', '-'.repeat(53) + '\n']

    let finalMessage = message
    for (const prefix of prefixes) {
      if (finalMessage.startsWith(prefix)) finalMessage = finalMessage.slice(prefix.length)
    }

    return finalMessage
  }

  private async generateEmbed(event: GenerateEmbedType, guildId: string | undefined): Promise<APIEmbed> {
    const embed: APIEmbed = {
      description: escapeMarkdown(event.message),

      footer: { text: beautifyInstanceName(event.instanceName) }
    } satisfies APIEmbed

    if ('color' in event) {
      embed.color = event.color
    }

    if ('user' in event && event.user != undefined) {
      embed.title = event.user.displayName()
      this.assignAvatar(embed, event.user)
    }

    // all enums are unique and must unique for this to work.
    // the other solutions is just too complicated
    if ('type' in event && event.type === MinecraftReactiveEventType.RequireGuild && guildId !== undefined) {
      const commands = await this.clientInstance
        .getClient()
        .guilds.fetch(guildId)
        .then((guild) => guild.commands.fetch())
      const joinCommand = commands.find((command) => command.name === 'join')
      const setupCommand = commands.find((command) => command.name === 'setup')

      const adminList = this.staticConfig.adminIds.map((adminId) => `<@${adminId}>`)
      embed.description =
        `Looks like the Minecraft account is not in a guild for this to work.\n` +
        `You can ask ${adminList.join(', ')} or any staff who has access\n` +
        `to set it up using </join:${joinCommand?.id}> before using </setup:${setupCommand?.id}> right after.`
    }

    return embed
  }

  private async reply(
    eventId: string,
    replyId: DiscordAssociatedMessage,
    embed: APIEmbed | undefined,
    attachments: AttachmentBuilder[] = []
  ): Promise<void> {
    const channel = await this.clientInstance.getClient().channels.fetch(replyId.channelId)
    assert.ok(channel != undefined)
    assert.ok(channel.isSendable())

    const result = await channel.send({
      embeds: embed === undefined ? undefined : [embed],
      files: attachments,
      reply: { messageReference: replyId.messageId },
      allowedMentions: { parse: [] }
    })
    this.messageAssociation.addMessageId(eventId, {
      guildId: result.guildId ?? undefined,
      channelId: result.channelId,
      messageId: result.id
    })
  }

  private async sendEmbedToChannels(
    event: GenerateEmbedType & Pick<BaseEvent, 'eventId'>,
    channels: string[],
    preGeneratedEmbed: APIEmbed | undefined
  ): Promise<Message<true>[]> {
    const messages: Message<true>[] = []

    for (const channelId of channels) {
      try {
        const channel = await this.clientInstance.getClient().channels.fetch(channelId)
        if (channel == undefined) continue
        assert.ok(channel.isSendable())
        assert.ok(channel.type === DiscordChannelType.GuildText)

        const embed =
          preGeneratedEmbed ??
          // commands always have a preGenerated embed
          (await this.generateEmbed(event, channel.guildId))
        const message = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } })

        messages.push(message)
        this.messageAssociation.addMessageId(event.eventId, {
          guildId: message.inGuild() ? message.guildId : undefined,
          channelId: message.channelId,
          messageId: message.id
        })
      } catch (error: unknown) {
        this.logger.error(`error sending to ${channelId}`, error)
      }
    }

    return messages
  }

  private async sendImageToChannels(
    eventId: string,
    channels: string[],
    images: Buffer[],
    text?: string
  ): Promise<Message<true>[]> {
    const messages: Message<true>[] = []

    for (const channelId of channels) {
      try {
        const channel = await this.clientInstance.getClient().channels.fetch(channelId)
        if (channel == undefined) continue
        assert.ok(channel.isSendable())
        assert.ok(channel.type === DiscordChannelType.GuildText)

        const message = await channel.send({ content: text, files: images })

        messages.push(message)
        this.messageAssociation.addMessageId(eventId, {
          guildId: message.inGuild() ? message.guildId : undefined,
          channelId: message.channelId,
          messageId: message.id
        })
      } catch (error: unknown) {
        this.logger.error(`error sending to ${channelId}`, error)
      }
    }

    return messages
  }

  private formatEmbedCommand(
    event: CommandEvent,
    feedback: boolean
  ): { embed: APIEmbed | undefined; attachments: AttachmentBuilder[] } {
    const attachments: AttachmentBuilder[] = []
    let embedNeeded = false
    const embed: APIEmbed = {
      color: Color.Good,

      title: escapeMarkdown(event.user.displayName()),
      footer: {
        text: feedback ? ' (command feedback)' : ''
      }
    }

    const { text, images } = this.extractCommandInfo(event.commandResponse)

    if (text !== undefined) {
      embedNeeded = true
      embed.description = text
    }
    if (images.length === 1 && text !== undefined) {
      embedNeeded = true

      embed.image = { url: 'attachment://image.png' }
      attachments.push(new AttachmentBuilder(images[0], { name: 'image.png' }))
    } else {
      attachments.push(...images.map((image) => new AttachmentBuilder(image)))
    }

    this.assignAvatar(embed, event.user)

    return { embed: embedNeeded ? embed : undefined, attachments }
  }

  private formatImageCommand(
    event: CommandEvent,
    feedback: boolean
  ): { content: string | undefined; images: Buffer[] } | undefined {
    let content: string | undefined
    const resultImages: Buffer[] = []

    const { text, images } = this.extractCommandInfo(event.commandResponse)

    if (images.length === 0) {
      assert.ok(text !== undefined)
      if (!MinecraftRenderer.renderSupported()) return undefined

      const message = this.formatRenderedImage(feedback ? 'FEED' : 'COMMAND', text)
      resultImages.push(MinecraftRenderer.generateMessageImage(message))
    } else {
      content = text
      resultImages.push(...images)
    }

    return { content, images: resultImages }
  }

  private extractCommandInfo(content: CommandEvent['commandResponse']): { text: string | undefined; images: Buffer[] } {
    let text: string | undefined
    const images: Buffer[] = []

    switch (content.type) {
      case ContentType.TextBased: {
        text = content.content

        if (content.extra !== undefined) {
          images.push(content.extra)
        }
        break
      }
      case ContentType.ImageBased: {
        images.push(...content.content)
        if (content.extra !== undefined) {
          text = content.extra
        }
        break
      }
    }
    assert.ok(text !== undefined || images.length > 0)

    return { text, images }
  }

  private async sendCommandResponse(event: CommandEvent, feedback: boolean): Promise<void> {
    let cachedEmbed: { embed: APIEmbed | undefined; attachments: AttachmentBuilder[] } | undefined
    let cachedImage: { content: string | undefined; images: Buffer[] } | undefined
    const replyIds = this.messageAssociation.getMessageId(event.originEventId)

    for (const replyId of replyIds) {
      try {
        if (this.minecraftRenderImageEnabled()) {
          cachedImage ??= this.formatImageCommand(event, feedback)
          if (cachedImage !== undefined) {
            await this.sendImageToChannels(event.eventId, [replyId.channelId], cachedImage.images, cachedImage.content)
            return
          }
        }

        cachedEmbed ??= this.formatEmbedCommand(event, feedback)
        await this.reply(event.eventId, replyId, cachedEmbed.embed, cachedEmbed.attachments)
      } catch (error: unknown) {
        this.logger.error(error, 'can not reply to message')
      }
    }
  }

  private assignAvatar(embed: APIEmbed, user: User): void {
    const avatar = user.avatar()
    if (avatar !== undefined) embed.thumbnail = { url: avatar }
    const profileLink = user.profileLink()
    if (profileLink !== undefined) embed.url = profileLink
  }

  private webhooks = new Map<string, Webhook>()

  private async getWebhook(channelId: string): Promise<Webhook> {
    const cachedWebhook = this.webhooks.get(channelId)
    if (cachedWebhook !== undefined) return cachedWebhook

    const client = this.clientInstance.getClient()
    assert.ok(client.isReady())

    const channel = (await client.channels.fetch(channelId)) as unknown as TextBasedChannelFields | null
    if (channel == undefined) throw new Error(`no access to channel ${channelId}?`)
    const webhooks = await channel.fetchWebhooks()

    let webhook = webhooks.find((h) => h.owner?.id === client.user.id)
    webhook ??= await channel.createWebhook({ name: 'Hypixel-Guild-Bridge' })

    this.webhooks.set(channelId, webhook)
    return webhook
  }

  private minecraftRenderImageEnabled(): boolean {
    const config = this.application.core.discordConfigurations
    return config.getTextToImage()
  }
}

type GenerateEmbedType = Pick<BaseEvent, 'instanceName'> & {
  message: string
  user?: User
  color?: Color
  type?: MinecraftReactiveEventType | undefined
}
