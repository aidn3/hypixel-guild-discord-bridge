const EventHandler = require("../common/EventHandler")
const {SCOPE} = require("../common/ClientInstance")
const {cleanMessage, getReplyUsername, escapeDiscord} = require("../util/DiscordMessageUtil");

const BadWords = require("bad-words")
const PROFANITY_WHITELIST = require("../../config/profane-whitelist.json")

const DISCORD_PUBLIC_CHANNEL = process.env.DISCORD_PUBLIC_CHANNEL
const DISCORD_OFFICER_CHANNEL = process.env.DISCORD_OFFICER_CHANNEL

class ChatManager extends EventHandler {
    profanityFilter

    constructor(clientInstance) {
        super(clientInstance)

        this.profanityFilter = new BadWords()
        this.profanityFilter.removeWords(...PROFANITY_WHITELIST)
    }

    registerEvents() {
        this.clientInstance.client.on('messageCreate', message => this.#onMessage(message))
    }

    async #onMessage(event) {
        if (event.author.bot) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        let replyUsername = await getReplyUsername(event)

        if (event.channel.id === DISCORD_PUBLIC_CHANNEL) {
            if (this.clientInstance.app.punishedUsers.muted(event.member.displayName)) {
                event.reply({
                    content: `*Looks like you are muted!*`,
                    ephemeral: true
                })
                return
            }

            let filteredMessage = profanityFilter.clean(content)
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
                username: event.member.displayName,
                replyUsername: replyUsername,
                message: filteredMessage
            })

        } else if (event.channel.id === DISCORD_OFFICER_CHANNEL) {
            this.clientInstance.app.emit("discord.chat", {
                clientInstance: this.clientInstance,
                scope: SCOPE.OFFICER,
                username: event.member.displayName,
                replyUsername: replyUsername,
                message: content
            })
        }
    }
}

module.exports = ChatManager