import type { Message, TextChannel } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import EmojisMap from 'emoji-name-map'
import type { Logger } from 'log4js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type { InstanceType } from '../../common/application-event.js'
import { ChannelType, PunishmentType } from '../../common/application-event.js'
import EventHandler from '../../common/event-handler.js'
import type EventHelper from '../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import type MessageAssociation from './common/message-association.js'
import type DiscordInstance from './discord-instance.js'

export default class ChatManager extends EventHandler<DiscordInstance, InstanceType.Discord> {
  private static readonly WarnMuteEvery = 3 * 60 * 1000

  private readonly messageAssociation: MessageAssociation
  private readonly lastMuteWarn = new Map<string, number>()
  private readonly config

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    messageAssociation: MessageAssociation,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    config: DiscordConfig
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.messageAssociation = messageAssociation
    this.config = config
  }

  registerEvents(): void {
    this.clientInstance.client.on('messageCreate', (message) => {
      void this.onMessage(message).catch(
        this.errorHandler.promiseCatch('handling incoming discord messageCreate event')
      )
    })
  }

  private async onMessage(event: Message): Promise<void> {
    if (event.author.bot) return

    let channelType: ChannelType
    if (this.config.publicChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.Public
    } else if (this.config.officerChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.Officer
    } else if (event.guildId) {
      return
    } else {
      channelType = ChannelType.Private
    }

    const discordName = event.member?.displayName ?? event.author.username
    const readableName = this.getReadableName(discordName, event.author.id)
    if (channelType !== ChannelType.Officer && (await this.hasBeenPunished(event, discordName, readableName))) return

    const replyUsername = await this.getReplyUsername(event)
    const readableReplyUsername =
      replyUsername == undefined ? undefined : this.getReadableName(replyUsername, replyUsername)

    const content = this.cleanMessage(event)
    if (content.length === 0) return
    const truncatedContent = await this.truncateText(event, content)

    const fillBaseEvent = this.eventHelper.fillBaseEvent()
    this.messageAssociation.addMessageId(fillBaseEvent.eventId, {
      guildId: event.guildId ?? undefined,
      channelId: event.channelId,
      messageId: event.id
    })

    const { filteredMessage, changed } = this.application.moderation.filterProfanity(truncatedContent)
    if (changed) {
      this.application.emit('profanityWarning', {
        ...fillBaseEvent,

        channelType: channelType,

        username: discordName,
        originalMessage: truncatedContent,
        filteredMessage: filteredMessage
      })
      await event.reply({
        content: '**Profanity warning, Your message has been edited:**\n' + escapeMarkdown(filteredMessage)
      })
    }

    this.application.emit('chat', {
      ...fillBaseEvent,

      channelType: channelType,
      channelId: event.channel.id,
      userId: Number.parseInt(event.author.id),
      username: readableName,
      replyUsername: readableReplyUsername,
      message: filteredMessage
    })
  }

  private async truncateText(message: Message, content: string): Promise<string> {
    /*
      minecraft has a limit of 256 chars per message
      256 - 232 = 24
      we reserve these 24 spare chars for username, prefix and ...
    */
    const length = 232
    if (content.length <= length) {
      return content
    }

    await message.reply({
      content: `Message too long! It has been shortened to ${length} characters.`
    })

    return content.slice(0, length) + '...'
  }

  private async hasBeenPunished(message: Message, discordName: string, readableName: string): Promise<boolean> {
    const punishments = this.application.moderation.punishments
    const userIdentifiers = [discordName, readableName, message.author.id]
    const mutedTill = punishments.punishedTill(userIdentifiers, PunishmentType.Mute)

    if (mutedTill != undefined) {
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

    const bannedTill = punishments.punishedTill(userIdentifiers, PunishmentType.Ban)
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

    const channel = messageEvent.channel as TextChannel
    const replyMessage = await channel.messages.fetch(messageEvent.reference.messageId)
    if (replyMessage.webhookId != undefined) return replyMessage.author.username

    if (messageEvent.guild == undefined) return
    const guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
    return guildMember.displayName
  }

  private getReadableName(username: string, id: string): string {
    // clear all non ASCII characters
    // eslint-disable-next-line no-control-regex
    username = username.replaceAll(/[^\u0000-\u007F]/g, '')

    username = username.trim().slice(0, 16)

    if (/^\w+$/.test(username)) return username
    if (username.includes(' ')) return username.split(' ')[0]

    return id
  }

  private cleanGuildEmoji(message: string): string {
    return message.replaceAll(/<:(\w+):\d{16,}>/g, (match) => {
      return match.slice(1, -1).replaceAll(/\d{16,}/g, '')
    })
  }

  private cleanStandardEmoji(message: string): string {
    for (const [emojiReadable, emojiUnicode] of Object.entries(EmojisMap.emoji)) {
      message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
    }

    return message
  }

  private cleanMessage(messageEvent: Message): string {
    let content = messageEvent.cleanContent

    content = this.cleanGuildEmoji(content)
    content = this.cleanStandardEmoji(content).trim()

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
