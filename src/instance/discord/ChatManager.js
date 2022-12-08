const EventHandler = require("../../common/EventHandler")
const {SCOPE} = require("../../common/ClientInstance")
const {cleanMessage, getReplyUsername, escapeDiscord, getReadableName} = require("../../util/DiscordMessageUtil");

const BadWords = require("bad-words")
const PROFANITY_CONFIG = require("../../../config/general-config.json").profanity


class ChatManager extends EventHandler {
    profanityFilter

    constructor(clientInstance) {
        super(clientInstance)

        this.profanityFilter = new BadWords({
            emptyList: !PROFANITY_CONFIG.enabled
        })
        this.profanityFilter.removeWords(...PROFANITY_CONFIG.whitelisted)
    }

    registerEvents() {
        this.clientInstance.client.on('messageCreate', message => this.#onMessage(message))
    }

    async #onMessage(event) {
        if (event.author.bot) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        let replyUsername = await getReplyUsername(event)

        if (this.clientInstance.publicChannels.some(id => id === event.channel.id)) {
            let mutedTill = this.clientInstance.app.punishedUsers.mutedTill(event.member.displayName);
            if (mutedTill) {
                event.reply({
                    content: `*Looks like you are muted on the chat-bridge.*\n`
                        + `*All messages you send won't reach any guild in-game or any other discord server.*\n`
                        + `*Your mute will expire <t:${mutedTill}:R>!*`,
                    ephemeral: true
                })
                return
            }

            let filteredMessage
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
                console.log(filteredMessage)
                event.reply({
                    content: `**Profanity warning, Your message has been edited:**\n` + escapeDiscord(filteredMessage),
                    ephemeral: true
                })
            }

            this.clientInstance.app.emit("discord.chat", {
                clientInstance: this.clientInstance,
                scope: SCOPE.PUBLIC,
                channelId: event.channel.id,
                username: getReadableName(event.member.displayName, event.member.id),
                replyUsername: replyUsername,
                message: filteredMessage
            })

        }

        if (this.clientInstance.officerChannels.some(id => id === event.channel.id)) {
            this.clientInstance.app.emit("discord.chat", {
                clientInstance: this.clientInstance,
                scope: SCOPE.OFFICER,
                channelId: event.channel.id,
                username: getReadableName(event.member.displayName, event.member.id),
                replyUsername: replyUsername,
                message: content
            })
        }
    }
}

module.exports = ChatManager