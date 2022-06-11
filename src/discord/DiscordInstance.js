const Discord = require('discord.js-light')
const {Intents} = require('discord.js')

const {ClientInstance} = require("../common/ClientInstance")
const Status = require("../common/Status")
const StateHandler = require("./handlers/StateHandler")
const ChatManager = require("./ChatManager")
const {CommandManager} = require('./CommandManager')
const {escapeDiscord} = require("../util/DiscordMessageUtil");
const {SCOPE, instanceType, LOCATION} = require("../common/ClientInstance")

const DISCORD_KEY = process.env.DISCORD_KEY

class DiscordInstance extends ClientInstance {
    client
    status
    #clientOptions
    #handlers

    constructor(app, instanceName, clientOptions) {
        super(app, instanceName)

        this.#clientOptions = clientOptions
        this.client = null
        this.status = Status.FRESH
        this.#handlers = [
            new StateHandler(this),
            new ChatManager(this),
            new CommandManager(this),
        ]

        this.app.on("*.chat", async ({clientInstance, scope, username, replyUsername, message}) => {
            if (clientInstance === this) return
            // webhooks received in same channel
            if (instanceType(clientInstance) === LOCATION.WEBHOOK) return


            let channelId
            if (scope === SCOPE.PUBLIC) channelId = process.env.DISCORD_PUBLIC_CHANNEL
            else if (scope === SCOPE.OFFICER) channelId = process.env.DISCORD_OFFICER_CHANNEL
            else return

            let webhook = await this.#getWebhook(channelId)
            let displayUsername = replyUsername ? `${username}⇾${replyUsername}` : username

            //TODO: integrate instanceName
            await webhook.send({
                content: escapeDiscord(message),
                username: displayUsername,
                avatarURL: `https://mc-heads.net/avatar/${username}`
            })
        })

        this.app.on("*.event.*", async ({clientInstance, scope, username, severity, message, removeLater}) => {
            if (clientInstance === this) return

            let channelId
            if (scope === SCOPE.PUBLIC) channelId = process.env.DISCORD_PUBLIC_CHANNEL
            else if (scope === SCOPE.OFFICER) channelId = process.env.DISCORD_OFFICER_CHANNEL
            else return

            let channel = await this.client.channels.fetch(channelId)

            let resP = channel.send({
                embeds: [{
                    title: escapeDiscord(username),
                    description: escapeDiscord(message),
                    url: `https:\/\/sky.shiiyu.moe\/stats\/${username}`,
                    thumbnail: {url: `https://cravatar.eu/helmavatar/${username}.png`},
                    color: severity
                }]
            })

            if (removeLater) {
                let deleteAfter = this.#clientOptions["events"]["deleteTempEventAfter"]
                setTimeout(() => resP.then(res => res.delete()), deleteAfter)
            }
        })
    }

    async connect() {
        this.client = new Discord.Client({
            makeCache: Discord.Options.cacheWithLimits(this.#clientOptions.cache),
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
        })

        await this.client.login(DISCORD_KEY)
        this.#handlers.forEach(handler => handler.registerEvents())
    }

    async #getWebhook(channelId) {
        let channel = await this.client.channels.fetch(channelId)
        let webhooks = await channel.fetchWebhooks()

        let webhook = webhooks.find(h => h.owner.id === this.client.user.id)
        if (!webhook) webhook = await channel.createWebhook('Hypixel-Guild-Bridge')
        return webhook
    }
}

module.exports = DiscordInstance