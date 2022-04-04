const EventHandler = require("../common/EventHandler")

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

        let content = ChatManager.#stripDiscordContent(event?.content || "").trim()

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

    static #stripDiscordContent(message) {
        return message
            .replace(/<[@|#|!|&]{1,2}(\d+){16,}>/g, '\n')
            .replace(/<:\w+:(\d+){16,}>/g, '\n')
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