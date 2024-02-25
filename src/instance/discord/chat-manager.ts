import axios from 'axios'
import BadWords from 'bad-words'
import type { Message, TextChannel } from 'discord.js'
import emojisMap from 'emoji-name-map'

import { ChannelType, InstanceType, PunishmentType } from '../../common/application-event'
import EventHandler from '../../common/event-handler'
import { escapeDiscord } from '../../util/shared-util'

import type DiscordInstance from './discord-instance'

export default class ChatManager extends EventHandler<DiscordInstance> {
  private readonly profanityFilter: BadWords.BadWords

  constructor(clientInstance: DiscordInstance) {
    super(clientInstance)

    this.profanityFilter = new BadWords({
      emptyList: !clientInstance.app.config.profanity.enabled
    })
    this.profanityFilter.removeWords(...clientInstance.app.config.profanity.whitelisted)
  }

  registerEvents(): void {
    this.clientInstance.client.on('messageCreate', async (message) => {
      await this.onMessage(message)
    })
  }

  private async onMessage(event: Message): Promise<void> {
    if (event.author.bot) return

    let channelType: ChannelType
    if (this.clientInstance.config.publicChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.PUBLIC
    } else if (this.clientInstance.config.officerChannelIds.includes(event.channel.id)) {
      channelType = ChannelType.OFFICER
    } else if (event.guildId) {
      return
    } else {
      channelType = ChannelType.PRIVATE
    }

    const discordName = event.member?.displayName ?? event.author.username
    const readableName = this.getReadableName(discordName, event.author.id)
    if (channelType !== ChannelType.OFFICER && (await this.hasBeenMuted(event, discordName, readableName))) return

    const replyUsername = await this.getReplyUsername(event)
    const readableReplyUsername =
      replyUsername == undefined ? undefined : this.getReadableName(replyUsername, replyUsername)

    const content = await this.cleanMessage(event)
    if (content.length === 0) return
    const truncatedContent = await this.truncateText(event, content)
    const filteredMessage = await this.proceedFiltering(event, truncatedContent)

    this.clientInstance.app.emit('chat', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      instanceType: InstanceType.DISCORD,
      channelType: channelType,
      channelId: event.channel.id,
      username: readableName,
      replyUsername: readableReplyUsername,
      message: filteredMessage
    })
  }

  async truncateText(message: Message, content: string): Promise<string> {
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

  async hasBeenMuted(message: Message, discordName: string, readableName: string): Promise<boolean> {
    const punishedUsers = this.clientInstance.app.punishedUsers
    const mutedTill =
      punishedUsers.punished(discordName, PunishmentType.MUTE) ??
      punishedUsers.punished(readableName, PunishmentType.MUTE) ??
      punishedUsers.punished(message.author.id, PunishmentType.MUTE)

    if (mutedTill != undefined) {
      await message.reply({
        content:
          '*Looks like you are muted on the chat-bridge.*\n' +
          "*All messages you send won't reach any guild in-game or any other discord server.*\n" +
          `*Your mute will expire <t:${mutedTill}:R>!*`
      })
      return true
    }

    return false
  }

  async proceedFiltering(message: Message, content: string): Promise<string> {
    let filteredMessage: string
    try {
      filteredMessage = this.profanityFilter.clean(content)
    } catch {
      /*
        profanity package has bug.
        will throw error if given one special character.
        example: clean("?")
        message is clear if thrown
      */
      filteredMessage = content
    }

    if (content !== filteredMessage) {
      await message.reply({
        content: '**Profanity warning, Your message has been edited:**\n' + escapeDiscord(filteredMessage)
      })
    }

    return filteredMessage
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
    for (const [emojiReadable, emojiUnicode] of Object.entries(emojisMap.emoji)) {
      message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
    }

    return message
  }

  private async cleanMessage(messageEvent: Message): Promise<string> {
    let content = messageEvent.cleanContent

    content = this.cleanGuildEmoji(content)
    content = this.cleanStandardEmoji(content).trim()

    if (messageEvent.attachments.size > 0) {
      for (const [, attachment] of messageEvent.attachments) {
        if (attachment.contentType?.includes('image') === true) {
          const link = attachment.url
          const linkWithoutTracking = await this.uploadToImgur(link)
          content += ` ${linkWithoutTracking ?? linkWithoutTracking}`
        } else {
          content += ' (ATTACHMENT)'
        }
      }
    }

    return content
  }

  private async uploadToImgur(link: string): Promise<string | undefined> {
    // This is encoded just to prevent automated tools from extracting it.
    // It is NOT a secret key
    const encoded = 'Q-2-x-p-Z-W-5-0-L-U-l-E-I-D-Y-0-O-W-Y-y-Z-m-I-0-O-G-U-1-O-T-c-2-N-w-=-='
    const decoded = Buffer.from(encoded.replaceAll('-', ''), 'base64').toString('utf8')

    const result = await axios
      .post(
        'https://api.imgur.com/3/image',
        {
          image: link,
          type: 'url'
        },
        { headers: { Authorization: decoded } }
      )
      .then((response) => {
        return (response.data as ImgurResponse).data.link
      })
      .catch((error) => {
        console.error(error)
      })

    return result || undefined
  }
}

interface ImgurResponse {
  data: { link: string }
}
