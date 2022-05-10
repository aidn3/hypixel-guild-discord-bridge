const ClientInstance = require("../common/ClientInstance")
const {cleanMessage} = require("../common/DiscordMessageUtil")
const {WebhookClient} = require("discord.js-light")
const ChatMetrics = require("../metrics/ChatMetrics");
const {LOCATION, SCOPE} = require("../metrics/Util");


class WebhookInstance extends ClientInstance {
    #discordBot
    #client
    #webhookReceiveId

    constructor(instanceName, bridge, discordBot, webhookSendUrl, webhookReceiveId) {
        super(instanceName, bridge)

        this.#discordBot = discordBot
        if (webhookSendUrl) this.#client = new WebhookClient({url: webhookSendUrl})
        this.#webhookReceiveId = webhookReceiveId
    }

    connect() {
        if (this.#webhookReceiveId) {
            this.#discordBot.on('messageCreate', message => this.#onChatMessage(message))
        }
    }

    async send(instanceName, username, message) {
        // TODO: integrate instanceName into webhook messages
        if (this.#client) {
            this.#client.send({
                content: message,
                username: username,
                avatarURL: `https://mc-heads.net/avatar/${username}`
            })
        }
    }

    #onChatMessage(event) {
        if (event?.webhookId !== this.#webhookReceiveId) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        ChatMetrics(LOCATION.WEBHOOK, SCOPE.PUBLIC, this.instanceName)
        this.bridge.onPublicChatMessage(this.instanceName, event.author.username, content)
    }
}

module.exports = WebhookInstance