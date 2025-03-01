import assert from 'node:assert'

import type { APIEmbed, TextBasedChannelFields, TextChannel, Webhook } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import type { Logger } from 'log4js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type {
  BaseInGameEvent,
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatusEvent,
  MinecraftChatEvent
} from '../../common/application-event.js'
import {
  ChannelType,
  Color,
  GuildPlayerEventType,
  InstanceType,
  MinecraftChatEventType
} from '../../common/application-event.js'
import Bridge from '../../common/bridge.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import type { DiscordAssociatedMessage } from './common/message-association.js'
import type MessageAssociation from './common/message-association.js'
import type DiscordInstance from './discord-instance.js'

export default class DiscordBridge extends Bridge<DiscordInstance> {
  private readonly messageAssociation: MessageAssociation
  private readonly config

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    messageAssociation: MessageAssociation,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    config: DiscordConfig
  ) {
    super(application, clientInstance, logger, errorHandler)

    this.messageAssociation = messageAssociation
    this.config = config
  }

  async onInstance(event: InstanceStatusEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    switch (event.instanceType) {
      case InstanceType.Commands:
      case InstanceType.Metrics:
      case InstanceType.Plugin:
      case InstanceType.Socket:
      case InstanceType.Logger:
      case InstanceType.Util:
      case InstanceType.Moderation: {
        return
      }
    }

    for (const channelId of this.config.publicChannelIds) {
      const channel = await this.clientInstance.client.channels.fetch(channelId)
      if (!channel?.isSendable()) continue

      const message = await channel.send({
        embeds: [
          {
            title: escapeMarkdown(event.instanceName),
            description: escapeMarkdown(event.message),
            color: Color.Info
          }
        ]
      })
      this.messageAssociation.addMessageId(event.eventId, { channelId: message.channelId, messageId: message.id })
    }
  }

  async onChat(event: ChatEvent): Promise<void> {
    let channels: string[]
    if (event.channelType === ChannelType.Public) {
      channels = this.config.publicChannelIds
    } else if (event.channelType === ChannelType.Officer) {
      channels = this.config.officerChannelIds
    } else {
      return
    }

    for (const channelId of channels) {
      if (event.instanceType === InstanceType.Discord && channelId === event.channelId) continue

      const webhook = await this.getWebhook(channelId)
      const displayUsername =
        event.instanceType === InstanceType.Discord && event.replyUsername !== undefined
          ? `${event.username}⇾${event.replyUsername}`
          : event.username

      // TODO: integrate instanceName
      const message = await webhook.send({
        content: escapeMarkdown(event.message),
        username: displayUsername,
        avatarURL: `https://mc-heads.net/avatar/${encodeURIComponent(event.username)}`
      })

      this.messageAssociation.addMessageId(event.eventId, { channelId: message.channelId, messageId: message.id })
    }
  }

  async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return
    const removeLater = event.type === GuildPlayerEventType.Offline || event.type === GuildPlayerEventType.Online

    await this.handleEventEmbed({ event, username: event.username, removeLater })
  }

  async onGuildGeneral(event: GuildGeneralEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return

    await this.handleEventEmbed({ event, username: undefined, removeLater: false })
  }

  private lastAdvertiseEvent = 0
  private lastRepeatEvent = 0
  private lastBlockEvent = 0

  async onMinecraftChatEvent(event: MinecraftChatEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return
    if (event.type === MinecraftChatEventType.Advertise) {
      if (this.lastAdvertiseEvent + 5000 < Date.now()) {
        this.lastAdvertiseEvent = Date.now()
      } else {
        return
      }
    }
    if (event.type === MinecraftChatEventType.Repeat) {
      if (this.lastRepeatEvent + 5000 < Date.now()) {
        this.lastRepeatEvent = Date.now()
      } else {
        return
      }
    }
    if (event.type === MinecraftChatEventType.Block) {
      if (this.lastBlockEvent + 5000 < Date.now()) {
        this.lastBlockEvent = Date.now()
      } else {
        return
      }
    }

    const replyIds = this.messageAssociation.getMessageId(event.originEventId)

    if (replyIds.length === 0) {
      await this.handleEventEmbed({ event, username: undefined, removeLater: false })
    } else {
      const embed = this.extendEmbed({ event, username: undefined })

      for (const replyId of replyIds) {
        try {
          await this.replyWithEmbed(event.eventId, replyId, embed)
        } catch (error: unknown) {
          this.logger.error(error, 'can not reply to message. sending the event independently')
          await this.handleEventEmbed({ event, username: undefined, removeLater: false })
        }
      }
    }
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    if (
      event.instanceType === this.clientInstance.instanceType &&
      event.instanceName === this.clientInstance.instanceName
    )
      return

    await this.handleEventEmbed({ event, username: event.username, removeLater: false })
  }

  async handleEventEmbed(options: {
    event: BaseInGameEvent<string> | BroadcastEvent
    username: string | undefined
    removeLater: boolean
  }): Promise<void> {
    const channels: string[] = []
    if (options.event.channels.includes(ChannelType.Public)) channels.push(...this.config.publicChannelIds)
    if (options.event.channels.includes(ChannelType.Officer)) channels.push(...this.config.officerChannelIds)

    const embed = this.extendEmbed(options)

    await this.sendEmbedToChannels(options.event.eventId, channels, options.removeLater, embed)
  }

  async onCommand(event: CommandEvent): Promise<void> {
    await this.sendCommandResponse(event, false)
  }

  async onCommandFeedback(event: CommandFeedbackEvent): Promise<void> {
    await this.sendCommandResponse(event, true)
  }

  private extendEmbed(options: {
    event: BaseInGameEvent<string> | BroadcastEvent
    username: string | undefined
  }): APIEmbed {
    const embed = {
      description: escapeMarkdown(options.event.message),

      color: options.event.color,
      footer: { text: options.event.instanceName }
    } satisfies APIEmbed
    if (options.username != undefined) {
      const extra = {
        title: escapeMarkdown(options.username),
        url: `https://sky.shiiyu.moe/stats/${encodeURIComponent(options.username)}`,
        thumbnail: { url: `https://cravatar.eu/helmavatar/${encodeURIComponent(options.username)}.png` }
      }
      Object.assign(embed, extra)
    }

    return embed
  }

  private async replyWithEmbed(eventId: string, replyId: DiscordAssociatedMessage, embed: APIEmbed): Promise<void> {
    const channel = await this.clientInstance.client.channels.fetch(replyId.channelId)
    assert(channel != undefined)
    assert(channel.isSendable())

    const result = await channel.send({ embeds: [embed], reply: { messageReference: replyId.messageId } })
    this.messageAssociation.addMessageId(eventId, { channelId: result.channelId, messageId: result.id })
  }

  private async sendEmbedToChannels(
    eventId: string,
    channels: string[],
    removeLater: boolean,
    embed: APIEmbed
  ): Promise<void> {
    for (const channelId of channels) {
      const channel = (await this.clientInstance.client.channels.fetch(channelId)) as unknown as TextChannel | null
      if (channel == undefined) return

      const message = await channel.send({ embeds: [embed] })
      this.messageAssociation.addMessageId(eventId, { channelId: message.channelId, messageId: message.id })

      if (removeLater) {
        const deleteAfter = this.config.deleteTempEventAfter
        setTimeout(
          () => {
            void message.delete().catch(this.errorHandler.promiseCatch('sending event embed and queuing for deletion'))
          },
          deleteAfter * 60 * 1000
        )
      }
    }
  }

  private async sendCommandResponse(event: CommandEvent, feedback: boolean): Promise<void> {
    let channels: string[] = []

    switch (event.channelType) {
      case ChannelType.Public: {
        channels = this.config.publicChannelIds
        break
      }
      case ChannelType.Officer: {
        channels = this.config.officerChannelIds
        break
      }
      case ChannelType.Private: {
        if (event.discordChannelId) {
          channels = [event.discordChannelId]
        }
        break
      }
    }

    if (event.instanceName === this.clientInstance.instanceName && event.discordChannelId && event.alreadyReplied) {
      channels = channels.filter((id) => id !== event.discordChannelId)
    }
    if (channels.length === 0) return

    const embed = {
      title: escapeMarkdown(event.username),
      url: `https://sky.shiiyu.moe/stats/${encodeURIComponent(event.username)}`,
      thumbnail: { url: `https://cravatar.eu/helmavatar/${encodeURIComponent(event.username)}.png` },
      color: Color.Good,
      description: `${escapeMarkdown(event.fullCommand)}\n**${escapeMarkdown(event.commandResponse)}**`,
      footer: {
        text: `${event.instanceName}${feedback ? ' (command feedback)' : ''}`
      }
    } satisfies APIEmbed

    await this.sendEmbedToChannels(event.eventId, channels, false, embed)
  }

  private async getWebhook(channelId: string): Promise<Webhook> {
    const channel = (await this.clientInstance.client.channels.fetch(
      channelId
    )) as unknown as TextBasedChannelFields | null
    if (channel == undefined) throw new Error(`no access to channel ${channelId}?`)
    const webhooks = await channel.fetchWebhooks()

    let webhook = webhooks.find((h) => h.owner?.id === this.clientInstance.client.user?.id)
    if (webhook == undefined) webhook = await channel.createWebhook({ name: 'Hypixel-Guild-Bridge' })
    return webhook
  }
}
