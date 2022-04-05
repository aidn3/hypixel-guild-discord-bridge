const EventHandler = require("../common/EventHandler")
const emojisMap = require("emoji-name-map");

const DISCORD_PUBLIC_CHANNEL = process.env.DISCORD_PUBLIC_CHANNEL
const DISCORD_OFFICER_CHANNEL = process.env.DISCORD_OFFICER_CHANNEL

class ChatManager extends EventHandler {
    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client.on('messageCreate', message => this.#onMessage(message))
    }

    #onMessage(event) {
        if (event.author.bot) return

        let content = event.cleanContent
        content = ChatManager.#cleanGuildEmoji(content)
        content = ChatManager.#cleanStandardEmoji(content)
        content = ChatManager.#stripDiscordContent(content).trim()

        if (event.attachments) {
            event.attachments.forEach(e => {
                let attachment = e
                if (attachment.contentType.includes("image")) {
                    content += ` ${attachment.url}`

                } else {
                    content += ` (ATTACHMENT)`
                }
            })
        }

        if (content.length === 0) return

        if (event.channel.id === DISCORD_PUBLIC_CHANNEL) {
            if (this.clientInstance.bridge.punishedUsers.muted(event.member.displayName)) {
                event.reply({
                    content: `*Looks like you are muted!*`,
                    ephemeral: true
                })
                return
            }

            this.clientInstance.bridge.onPublicChatMessage(
                this.clientInstance,
                event.member.displayName,
                content)

        } else if (event.channel.id === DISCORD_OFFICER_CHANNEL) {
            this.clientInstance.bridge.onOfficerChatMessage(
                this.clientInstance,
                event.member.displayName,
                content
            )
        }
    }

    static #cleanGuildEmoji(message) {
        return message.replace(/<:(\w+):\d{16,}>/g, match => {
            let emoji = match
                .substring(1, match.length - 1)
                .replace(/\d{16,}/g, "")
            console.log(emoji)
            return emoji
        })
    }

    static #cleanStandardEmoji(message) {
        for (const [emojiReadable, emojiUnicode] of Object.entries(emojisMap.emoji)) {
            message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
        }

        return message
    }

    static #stripDiscordContent(message) {
        return message
            .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '\n')
            .split('\n')
            .map(part => {
                part = part.trim()
                return part.length === 0 ? '' : part + ' '
            })
            .join('')
    }
}

module.exports = ChatManager