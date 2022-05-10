const ClientInstance = require("../common/ClientInstance")
const {cleanMessage} = require("../common/DiscordMessageUtil")
const {WebhookClient} = require("discord.js-light")
const {sendMetric, SCOPE, TYPE, LOCATION} = require("../common/PrometheusMetrics");


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
            })
        }
    }

    #onChatMessage(event) {
        if (event?.webhookId !== this.#webhookReceiveId) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        sendMetric(LOCATION.WEBHOOK, SCOPE.PUBLIC, TYPE.CHAT, this.instanceName)
        this.bridge.onPublicChatMessage(this.instanceName, event.author.username, content)
    }
}

module.exports = WebhookInstance