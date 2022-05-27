const EventHandler = require("../common/EventHandler")
const {getLocation, SCOPE} = require("../metrics/Util")
const ChatMetrics = require("../metrics/ChatMetrics")
const {cleanMessage, getReplyUsername} = require("../common/DiscordMessageUtil");

const DISCORD_PUBLIC_CHANNEL = process.env.DISCORD_PUBLIC_CHANNEL
const DISCORD_OFFICER_CHANNEL = process.env.DISCORD_OFFICER_CHANNEL

class ChatManager extends EventHandler {
    constructor(clientInstance) {
        super(clientInstance)
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
            if (this.clientInstance.bridge.punishedUsers.muted(event.member.displayName)) {
                event.reply({
                    content: `*Looks like you are muted!*`,
                    ephemeral: true
                })
                return
            }

            ChatMetrics(getLocation(this.clientInstance), SCOPE.PUBLIC, this.clientInstance.instanceName)
            this.clientInstance.bridge.onPublicChatMessage(
                this.clientInstance,
                event.member.displayName,
                replyUsername,
                content)

        } else if (event.channel.id === DISCORD_OFFICER_CHANNEL) {
            ChatMetrics(getLocation(this.clientInstance), SCOPE.OFFICER, this.clientInstance.instanceName)
            this.clientInstance.bridge.onOfficerChatMessage(
                this.clientInstance,
                event.member.displayName,
                replyUsername,
                content
            )
        }
    }
}

module.exports = ChatManager