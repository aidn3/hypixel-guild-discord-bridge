const {ClientInstance} = require("../common/ClientInstance")
const {cleanMessage, escapeDiscord} = require("../util/DiscordMessageUtil")
const {WebhookClient} = require("discord.js-light")
const {SCOPE} = require("../common/ClientInstance")


class WebhookInstance extends ClientInstance {
    #discordBot
    #client
    #webhookReceiveId

    constructor(app, instanceName, discordBot, webhookSendUrl, webhookReceiveId) {
        super(app, instanceName)

        this.#discordBot = discordBot
        if (webhookSendUrl) this.#client = new WebhookClient({url: webhookSendUrl})
        this.#webhookReceiveId = webhookReceiveId

        this.app.on("*.chat", async ({clientInstance, username, replyUsername, message}) => {
            if (clientInstance === this) return

            // TODO: integrate instanceName into webhook messages
            let displayUsername = replyUsername ? `${username}▸${replyUsername}` : username

            this.#client?.send({
                content: escapeDiscord(message),
                username: displayUsername,
                avatarURL: `https://mc-heads.net/avatar/${username}`
            })
        })
    }

    connect() {
        if (this.#webhookReceiveId) {
            this.#discordBot.on('messageCreate', message => this.#onChatMessage(message))
        }
    }

    #onChatMessage(event) {
        if (event?.webhookId !== this.#webhookReceiveId) return

        let content = cleanMessage(event)
        if (content.length === 0) return

        this.app.emit("webhook.chat", {
            clientInstance: this,
            scope: SCOPE.PUBLIC,
            username: event.author.username,
            replyUsername: null,//TODO: find way to get replyUsername for webhooks (if possible at all)
            message: content
        })
    }
}

module.exports = WebhookInstance