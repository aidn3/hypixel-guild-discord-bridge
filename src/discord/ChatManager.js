const EventHandler = require("../common/EventHandler")
const {sendMetric, getLocation, SCOPE, TYPE} = require("../common/PrometheusMetrics");
const {cleanMessage} = require("../common/DiscordMessageUtil");

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

        let content = cleanMessage(event)
        if (content.length === 0) return

        if (event.channel.id === DISCORD_PUBLIC_CHANNEL) {
            if (this.clientInstance.bridge.punishedUsers.muted(event.member.displayName)) {
                event.reply({
                    content: `*Looks like you are muted!*`,
                    ephemeral: true
                })
                return
            }

            sendMetric(getLocation(this.clientInstance), SCOPE.PUBLIC, TYPE.CHAT, this.clientInstance.instanceName)
            this.clientInstance.bridge.onPublicChatMessage(
                this.clientInstance,
                event.member.displayName,
                content)

        } else if (event.channel.id === DISCORD_OFFICER_CHANNEL) {
            sendMetric(getLocation(this.clientInstance), SCOPE.OFFICER, TYPE.CHAT, this.clientInstance.instanceName)
            this.clientInstance.bridge.onOfficerChatMessage(
                this.clientInstance,
                event.member.displayName,
                content
            )
        }
    }
}

module.exports = ChatManager