import { Message } from "discord.js"
import * as BadWords from "bad-words"
import EventHandler from "../../common/EventHandler"
import { LOCATION, SCOPE } from "../../common/ClientInstance"
import { cleanMessage, escapeDiscord, getReadableName, getReplyUsername } from "../../util/DiscordMessageUtil"
import DiscordInstance from "./DiscordInstance"

export default class ChatManager extends EventHandler<DiscordInstance> {
  private readonly profanityFilter: BadWords.BadWords

  constructor(clientInstance: DiscordInstance) {
    super(clientInstance)

    this.profanityFilter = new BadWords({
      emptyList: !clientInstance.app.config.profanityFilter.enabled
    })
    this.profanityFilter.removeWords(...clientInstance.app.config.profanityFilter.whitelisted)
  }

  registerEvents(): void {
    this.clientInstance.client.on("messageCreate", async (message) => {
      await this.onMessage(message)
    })
  }

  private async onMessage(event: Message): Promise<void> {
    if (event.author.bot) return

    let scope: SCOPE
    if (this.clientInstance.config.publicChannelIds.includes(event.channel.id)) {
      scope = SCOPE.PUBLIC
    } else if (this.clientInstance.config.officerChannelIds.includes(event.channel.id)) {
      scope = SCOPE.OFFICER
    } else {
      return
    }

    const discordName = event.member?.displayName ?? event.author.username
    const readableName = getReadableName(discordName, event.author.id)
    if (scope !== SCOPE.OFFICER && (await this.hasBeenMuted(event, discordName, readableName))) return

    const replyUsername = await getReplyUsername(event)
    const readableReplyUsername = replyUsername == undefined ? undefined : getReadableName(replyUsername, replyUsername)

    const content = cleanMessage(event)
    if (content.length === 0) return
    const truncatedContent = await this.truncateText(event, content)
    const filteredMessage = await this.proceedFiltering(event, truncatedContent)

    this.clientInstance.app.emit("chat", {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      location: LOCATION.DISCORD,
      scope: scope,
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

    return content.slice(0, length) + "..."
  }

  async hasBeenMuted(message: Message, discordName: string, readableName: string): Promise<boolean> {
    const punishedUsers = this.clientInstance.app.punishedUsers
    const mutedTill =
      punishedUsers.mutedTill(discordName) ??
      punishedUsers.mutedTill(readableName) ??
      punishedUsers.mutedTill(message.author.id)

    if (mutedTill != undefined) {
      await message.reply({
        content:
          "*Looks like you are muted on the chat-bridge.*\n" +
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
        content: "**Profanity warning, Your message has been edited:**\n" + escapeDiscord(filteredMessage)
      })
    }

    return filteredMessage
  }
}
