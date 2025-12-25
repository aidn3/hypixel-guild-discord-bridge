import assert from 'node:assert'

import type { Client, Message } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { InstanceType } from '../../common/application-event.js'
import { ChannelType, PunishmentType } from '../../common/application-event.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { DiscordUser } from '../../common/user'

import { FilteredReaction, MutedReaction, UnverifiedReaction } from './common/discord-config.js'
import type MessageAssociation from './common/message-association.js'
import type DiscordInstance from './discord-instance.js'

export default class ChatManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly WarnMuteEvery = 10 * 60 * 1000
  private static readonly WarnVerificationEvery = 10 * 60 * 1000
  private readonly lastVerificationWarn = new Map<string, number>()

  private readonly messageAssociation: MessageAssociation
  private readonly lastMuteWarn = new Map<string, number>()

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    messageAssociation: MessageAssociation,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.messageAssociation = messageAssociation
  }

  override registerEvents(client: Client): void {
    client.on('messageCreate', (message) => {
      void this.onMessage(message).catch(
        this.errorHandler.promiseCatch('handling incoming discord messageCreate event')
      )
    })
  }

  private async onMessage(event: Message): Promise<void> {
    if (event.author.bot) return

    const config = this.application.core.discordConfigurations
    const bridgeResolver = this.application.bridgeResolver

    // First, check if this channel belongs to a specific bridge
    const bridgeId = bridgeResolver.getBridgeIdForChannel(event.channel.id)
    const bridgeChannelType = bridgeResolver.getChannelTypeForChannel(event.channel.id)

    let channelType: ChannelType
    if (bridgeResolver.isMultiBridgeEnabled() && bridgeChannelType !== undefined) {
      // Multi-bridge mode: use the bridge-specific channel type
      channelType = bridgeChannelType === 'public' ? ChannelType.Public : ChannelType.Officer
    } else if (config.getPublicChannelIds().includes(event.channel.id)) {
      channelType = ChannelType.Public
    } else if (config.getOfficerChannelIds().includes(event.channel.id)) {
      channelType = ChannelType.Officer
    } else if (event.guildId) {
      return
    } else {
      channelType = ChannelType.Private
    }

    const userProfile = this.clientInstance.profileByUser(event.author, event.member ?? undefined)
    const user = await this.application.core.initializeDiscordUser(userProfile, {})

    if (!user.verified() && config.getEnforceVerification()) {
      const emoji = event.client.application.emojis.cache.find((emoji) => emoji.name === UnverifiedReaction.name)
      if (emoji !== undefined) await event.react(emoji)

      const currentTimestamp = Date.now()
      if (
        (this.lastVerificationWarn.get(event.author.id) ?? 0) + ChatManager.WarnVerificationEvery <
        currentTimestamp
      ) {
        this.lastVerificationWarn.set(event.author.id, currentTimestamp)
        assert.ok(event.inGuild())
        const commands = await event.guild.commands.fetch()
        const linkCommand = commands.find((command) => command.name === 'link')

        await event.reply({
          content:
            `**Verification Warning:**\n` +
            `You can not talk in this channel unless you </link:${linkCommand?.id}> (press the blue link button here) first.`
        })
      }
      return
    }

    if (channelType === ChannelType.Public && (await this.hasBeenPunished(event, user))) {
      return
    }
    const readableReplyUsername = await this.getReplyUsername(event)

    const content = this.cleanMessage(event)
    if (content.length === 0) return

    const fillBaseEvent = this.eventHelper.fillBaseEvent()
    this.messageAssociation.addMessageId(fillBaseEvent.eventId, {
      guildId: event.guildId ?? undefined,
      channelId: event.channelId,
      messageId: event.id
    })

    const { filteredMessage, changed } = this.application.core.filterProfanity(content)
    if (changed) {
      await this.application.emit('profanityWarning', {
        ...fillBaseEvent,

        channelType: channelType,

        user: user,
        originalMessage: content,
        filteredMessage: filteredMessage
      })

      const emoji = event.client.application.emojis.cache.find((emoji) => emoji.name === FilteredReaction.name)
      if (emoji !== undefined) await event.react(emoji)
      if (emoji === undefined || config.getAlwaysReplyReaction()) {
        await event.reply({
          content: '**Profanity warning, Your message has been edited:**\n' + escapeMarkdown(filteredMessage)
        })
      }
    }

    await this.application.emit('chat', {
      ...fillBaseEvent,

      channelType: channelType,
      channelId: event.channel.id,
      bridgeId: bridgeId,

      user: user,
      replyUsername: readableReplyUsername,
      message: filteredMessage
    })
  }

  private async hasBeenPunished(message: Message, user: DiscordUser): Promise<boolean> {
    const punishments = user.punishments()
    const mutedTill = punishments.punishedTill(PunishmentType.Mute)
    if (mutedTill != undefined) {
      const emoji = message.client.application.emojis.cache.find((emoji) => emoji.name === MutedReaction.name)
      if (emoji !== undefined) await message.react(emoji)

      const currentTimestamp = Date.now()
      if ((this.lastMuteWarn.get(message.author.id) ?? 0) + ChatManager.WarnMuteEvery < currentTimestamp) {
        this.lastMuteWarn.set(message.author.id, currentTimestamp)
        await message.reply({
          content:
            '*Looks like you are muted on the chat-bridge.*\n' +
            "*All messages you send won't reach any guild in-game or any other discord server.*\n" +
            `*Your mute expires <t:${Math.floor(mutedTill / 1000)}:R>!*`
        })
      }

      return true
    }

    const bannedTill = punishments.punishedTill(PunishmentType.Ban)
    if (bannedTill != undefined) {
      await message.reply({
        content:
          '*Looks like you are banned on the chat-bridge.*\n' +
          "*All messages you send won't reach any guild in-game or any other discord server.*\n" +
          `*Your ban expires <t:${Math.floor(bannedTill / 1000)}:R>!*`
      })
      return true
    }

    return false
  }

  private async getReplyUsername(messageEvent: Message): Promise<string | undefined> {
    if (messageEvent.reference?.messageId === undefined) return

    const channel = messageEvent.channel

    const replyMessage = await channel.messages.fetch(messageEvent.reference.messageId)
    if (replyMessage.webhookId != undefined) return replyMessage.author.username

    const resolvedProfile = this.clientInstance.profileByUser(replyMessage.author, replyMessage.member ?? undefined)
    const replyUser = await this.application.core.initializeDiscordUser(resolvedProfile, {})

    return replyUser.displayName()
  }

  private cleanGuildEmoji(message: string): string {
    return message.replaceAll(/<:(\w+):\d{16,}>/g, (match) => {
      return match.slice(1, -1).replaceAll(/\d{16,}/g, '')
    })
  }

  private cleanMessage(messageEvent: Message): string {
    let content = messageEvent.cleanContent

    content = this.cleanGuildEmoji(content).trim()

    if (messageEvent.attachments.size > 0) {
      for (const [, attachment] of messageEvent.attachments) {
        if (attachment.contentType?.includes('image') === true) {
          const link = attachment.url
          content += ` ${link}`
        } else {
          content += ' (ATTACHMENT)'
        }
      }
    }

    return content
  }
}
