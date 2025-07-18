import assert from 'node:assert'

import type { Client, Message } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { InstanceType } from '../../common/application-event.js'
import { ChannelType, PunishmentType } from '../../common/application-event.js'
import type { ConfigManager } from '../../common/config-manager.js'
import EventHandler from '../../common/event-handler.js'
import type EventHelper from '../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { MojangProfile } from '../../utility/mojang.js'
import type { Link } from '../users/features/verification.js'
import { LinkType } from '../users/features/verification.js'

import type { DiscordConfig } from './common/discord-config.js'
import { FilteredReaction, MutedReaction, UnverifiedReaction } from './common/discord-config.js'
import type MessageAssociation from './common/message-association.js'
import type DiscordInstance from './discord-instance.js'

export default class ChatManager extends EventHandler<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly WarnMuteEvery = 10 * 60 * 1000
  private static readonly WarnVerificationEvery = 10 * 60 * 1000
  private readonly lastVerificationWarn = new Map<string, number>()

  private readonly messageAssociation: MessageAssociation
  private readonly lastMuteWarn = new Map<string, number>()
  private readonly config: ConfigManager<DiscordConfig>

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    config: ConfigManager<DiscordConfig>,
    messageAssociation: MessageAssociation,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.config = config
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

    const config = this.config.data
    let channelType: ChannelType
    if (config.publicChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.Public
    } else if (config.officerChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.Officer
    } else if (event.guildId) {
      return
    } else {
      channelType = ChannelType.Private
    }

    const verificationLink = await this.fetchLink(event)
    if (verificationLink.type !== LinkType.Confirmed && this.config.data.enforceVerification) {
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
            `You can not talk in this channel unless you </link:${linkCommand?.id}> first.`
        })
      }
      return
    }

    const mojangProfile =
      verificationLink.type === LinkType.Confirmed
        ? await this.application.mojangApi.profileByUuid(verificationLink.link.uuid)
        : undefined
    const discordName = mojangProfile?.name ?? event.member?.displayName ?? event.author.username
    const readableName = mojangProfile?.name ?? this.getReadableName(discordName, event.author.id)
    if (
      channelType !== ChannelType.Officer &&
      (await this.hasBeenPunished(event, discordName, readableName, mojangProfile))
    ) {
      return
    }
    const replyUsername = await this.getReplyUsername(event)
    const readableReplyUsername =
      replyUsername == undefined ? undefined : this.getReadableName(replyUsername, replyUsername)

    const content = this.cleanMessage(event)
    if (content.length === 0) return

    const fillBaseEvent = this.eventHelper.fillBaseEvent()
    this.messageAssociation.addMessageId(fillBaseEvent.eventId, {
      guildId: event.guildId ?? undefined,
      channelId: event.channelId,
      messageId: event.id
    })

    const { filteredMessage, changed } = this.application.moderation.filterProfanity(content)
    if (changed) {
      this.application.emit('profanityWarning', {
        ...fillBaseEvent,

        channelType: channelType,

        username: discordName,
        originalMessage: content,
        filteredMessage: filteredMessage
      })

      const emoji = event.client.application.emojis.cache.find((emoji) => emoji.name === FilteredReaction.name)
      if (emoji !== undefined) await event.react(emoji)
      if (emoji === undefined || this.config.data.alwaysReplyReaction) {
        await event.reply({
          content: '**Profanity warning, Your message has been edited:**\n' + escapeMarkdown(filteredMessage)
        })
      }
    }

    this.application.emit('chat', {
      ...fillBaseEvent,

      channelType: channelType,
      channelId: event.channel.id,

      permission: this.clientInstance.resolvePrivilegeLevel(
        event.author.id,
        event.member ? [...event.member.roles.cache.keys()] : []
      ),

      userId: event.author.id,
      username: readableName,
      replyUsername: readableReplyUsername,
      message: filteredMessage
    })
  }

  private async hasBeenPunished(
    message: Message,
    discordName: string,
    readableName: string,
    mojangProfile: MojangProfile | undefined
  ): Promise<boolean> {
    const punishments = this.application.moderation.punishments
    const userIdentifiers = [discordName, readableName, message.author.id]
    if (mojangProfile !== undefined) userIdentifiers.push(mojangProfile.name, mojangProfile.id)
    const mutedTill = punishments.punishedTill(userIdentifiers, PunishmentType.Mute)

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

    const channel = messageEvent.channel

    const replyMessage = await channel.messages.fetch(messageEvent.reference.messageId)
    if (replyMessage.webhookId != undefined) return replyMessage.author.username

    const verificationLink = await this.fetchLink(replyMessage)
    if (verificationLink.type !== LinkType.None) {
      return await this.application.mojangApi.profileByUuid(verificationLink.link.uuid).then((profile) => profile.name)
    }

    if (messageEvent.guild == undefined) return
    const guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
    return guildMember.displayName
  }

  private getReadableName(username: string, id: string): string {
    return this.cleanUsername(username) ?? id
  }

  private cleanUsername(username: string | undefined): string | undefined {
    if (username === undefined) return undefined

    // clear all non ASCII characters
    // eslint-disable-next-line no-control-regex
    username = username.replaceAll(/[^\u0000-\u007F]/g, '')

    username = username.trim().slice(0, 16)

    if (/^\w+$/.test(username)) return username
    if (username.includes(' ')) return username.split(' ')[0]
    return undefined
  }

  private async fetchLink(event: Message): Promise<Link> {
    return await this.application.usersManager.verification.findByDiscord(event.author.id)
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
