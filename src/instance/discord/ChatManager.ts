import { Message } from 'discord.js'
import EventHandler from '../../common/EventHandler'
import { LOCATION, SCOPE } from '../../common/ClientInstance'
import DiscordInstance from './DiscordInstance'
import { cleanMessage, escapeDiscord, getReadableName, getReplyUsername } from '../../util/DiscordMessageUtil'
import BadWordsType from '../../type/BadWords'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BadWords = require('bad-words') as typeof BadWordsType

export default class ChatManager extends EventHandler<DiscordInstance> {
  private readonly profanityFilter: BadWordsType

  constructor(clientInstance: DiscordInstance) {
    super(clientInstance)

    this.profanityFilter = new BadWords({
      emptyList: !clientInstance.app.config.profanityFilter.enabled
    })
    this.profanityFilter.removeWords(...clientInstance.app.config.profanityFilter.whitelisted)
  }

  registerEvents(): void {
    this.clientInstance.client.on('messageCreate', async (message) => {
      await this.onMessage(message)
    })
  }

  private async onMessage(event_: any): Promise<void> {
    const event = event_ as Message
    if (event.author.bot) return

    const content = cleanMessage(event)
    if (content.length === 0) return

    const replyUsername = await getReplyUsername(event)
    const readableReplyUsername = replyUsername != null ? getReadableName(replyUsername, replyUsername) : undefined
    const discordName = event.member?.displayName ?? event.author.username
    const readableName = getReadableName(discordName, event.author.id)

    if (this.clientInstance.config.publicChannelIds.some((id) => id === event.channel.id)) {
      if (await this.hasBeenMuted(event, discordName, readableName)) return
      const filteredMessage = await this.proceedFiltering(event, content)

      this.clientInstance.app.emit('chat', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.DISCORD,
        scope: SCOPE.PUBLIC,
        channelId: event.channel.id,
        username: readableName,
        replyUsername: readableReplyUsername,
        message: filteredMessage
      })
    }

    if (this.clientInstance.config.officerChannelIds.some((id) => id === event.channel.id)) {
      this.clientInstance.app.emit('chat', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.DISCORD,
        scope: SCOPE.OFFICER,
        channelId: event.channel.id,
        username: readableName,
        replyUsername: readableReplyUsername,
        message: content
      })
    }
  }

  async hasBeenMuted(event: Message, discordName: string, readableName: string): Promise<boolean> {
    const punishedUsers = this.clientInstance.app.punishedUsers
    const mutedTill =
      punishedUsers.mutedTill(discordName) ??
      punishedUsers.mutedTill(readableName) ??
      punishedUsers.mutedTill(event.author.id)

    if (mutedTill != null) {
      await event.reply({
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
    } catch (ignored) {
      // profanity package has bug.
      // will throw error if given one special character.
      // example: clean("?")

      // message is clear if thrown
      filteredMessage = content
    }

    if (content !== filteredMessage) {
      await message.reply({
        content: '**Profanity warning, Your message has been edited:**\n' + escapeDiscord(filteredMessage)
      })
    }

    return filteredMessage
  }
}
