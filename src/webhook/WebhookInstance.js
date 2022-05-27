const ClientInstance = require("../common/ClientInstance")
const {cleanMessage, escapeDiscord} = require("../common/DiscordMessageUtil")
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

    async send(instanceName, username, replyUsername, message) {
        // TODO: integrate instanceName into webhook messages

        let displayUsername = replyUsername ? `${username}▸${replyUsername}` : username

        if (this.#client) {
            this.#client.send({
                content: escapeDiscord(message),
                username: displayUsername,
                avatarURL: `https://mc-heads.net/avatar/${username}`
            })
        }
    }

    #onChatMessage(event) {
        if (event?.webhookId !== this.#webhookReceiveId) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        ChatMetrics(LOCATION.WEBHOOK, SCOPE.PUBLIC, this.instanceName)
        this.bridge.onPublicChatMessage(
            this.instanceName,
            event.author.username,
            null, //TODO: find way to get replyUsername for webhooks (if possible at all)
            content
        )
    }
}

module.exports = WebhookInstance