import {Message} from "discord.js"
import EventHandler from "../../common/EventHandler"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import DiscordInstance from "./DiscordInstance"
import {cleanMessage, escapeDiscord, getReadableName, getReplyUsername} from "../../util/DiscordMessageUtil"

const BadWords = require("bad-words")


export default class ChatManager extends EventHandler<DiscordInstance> {
    private profanityFilter: { clean: (text: string) => string, removeWords: (...args: string[]) => void }

    constructor(clientInstance: DiscordInstance) {
        super(clientInstance)

        this.profanityFilter = new BadWords({
            emptyList: !clientInstance.app.config.profanityFilter.enabled
        })
        this.profanityFilter.removeWords(...clientInstance.app.config.profanityFilter.whitelisted)
    }

    registerEvents() {
        this.clientInstance.client.on('messageCreate', (message) => this.onMessage(message))
    }

    private async onMessage(event_: any): Promise<void> {
        const event = <Message>event_
        if (event.author.bot) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        const replyUsername = await getReplyUsername(event)
        const readableReplyUsername = replyUsername ? getReadableName(replyUsername, replyUsername) : undefined
        const discordName = event.member?.displayName || event.author.username
        const readableName = getReadableName(discordName, event.author?.id)

        if (this.clientInstance.config.publicChannelIds.some(id => id === event.channel.id)) {
            if (await this.hasBeenMuted(event, discordName, readableName)) return
            let filteredMessage = await this.proceedFiltering(event, content)

            this.clientInstance.app.emit("chat", {
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

        if (this.clientInstance.config.officerChannelIds.some(id => id === event.channel.id)) {
            this.clientInstance.app.emit("chat", {
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
        let mutedTill = punishedUsers.mutedTill(discordName) ||
            punishedUsers.mutedTill(readableName) ||
            punishedUsers.mutedTill(event.author.id)

        if (mutedTill) {
            await event.reply({
                content: `*Looks like you are muted on the chat-bridge.*\n`
                    + `*All messages you send won't reach any guild in-game or any other discord server.*\n`
                    + `*Your mute will expire <t:${mutedTill}:R>!*`
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
                content: `**Profanity warning, Your message has been edited:**\n` + escapeDiscord(filteredMessage)
            })
        }

        return filteredMessage
    }
}
