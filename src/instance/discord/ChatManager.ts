import {Message} from "discord.js"
import {ChatEvent} from "../../common/ApplicationEvent"
import EventHandler from "../../common/EventHandler"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import DiscordInstance from "./DiscordInstance"
import {cleanMessage, escapeDiscord, getReadableName, getReplyUsername} from "../../util/DiscordMessageUtil"

const BadWords = require("bad-words")

const PROFANITY_CONFIG = require("../../../config/general-config.json").profanity


export default class ChatManager extends EventHandler<DiscordInstance> {
    private profanityFilter: { clean: (text: string) => string, removeWords: (...args: string[]) => void }

    constructor(clientInstance: DiscordInstance) {
        super(clientInstance)

        this.profanityFilter = new BadWords({
            emptyList: !PROFANITY_CONFIG.enabled
        })
        this.profanityFilter.removeWords(...PROFANITY_CONFIG.whitelisted)
    }

    registerEvents() {
        this.clientInstance.client.on('messageCreate', (message) => this.#onMessage(message))
    }

    async #onMessage(event_: any): Promise<void> {
        const event = <Message>event_
        if (event.author.bot) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        let replyUsername = await getReplyUsername(event)

        if (this.clientInstance.publicChannels.some(id => id === event.channel.id)) {
            if (await this.hasBeenMuted(event)) return
            let filteredMessage = await this.proceedFiltering(event, content)

            this.clientInstance.app.emit("chat", <ChatEvent>{
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.DISCORD,
                scope: SCOPE.PUBLIC,
                channelId: event.channel.id,
                username: getReadableName(event.member?.displayName || event.author.username, event.author?.id),
                replyUsername: replyUsername,
                message: filteredMessage
            })
        }

        if (this.clientInstance.officerChannels.some(id => id === event.channel.id)) {
            this.clientInstance.app.emit("chat", <ChatEvent>{
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.DISCORD,
                scope: SCOPE.OFFICER,
                channelId: event.channel.id,
                username: getReadableName(event.member?.displayName || event.author.username, event.author?.id),
                replyUsername: replyUsername,
                message: content
            })
        }
    }

    async hasBeenMuted(event: Message): Promise<boolean> {
        let mutedTill = this.clientInstance.app.punishedUsers.mutedTill(event.member?.displayName || event.author.id)
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
