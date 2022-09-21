const Discord = require('discord.js-light')
const {Intents} = require('discord.js')

const {ClientInstance} = require("../common/ClientInstance")
const Status = require("../common/Status")
const StateHandler = require("./handlers/StateHandler")
const ChatManager = require("./ChatManager")
const {CommandManager} = require('./CommandManager')
const {escapeDiscord} = require("../util/DiscordMessageUtil");
const {SCOPE, instanceType, LOCATION} = require("../common/ClientInstance")
const COLOR = require('../../config/discord-config.json').events.color

const DISCORD_KEY = process.env.DISCORD_KEY

class DiscordInstance extends ClientInstance {
    client
    status
    #clientOptions
    #handlers

    publicChannels = []
    officerChannels = []
    officerRoles = []

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

        this.publicChannels = process.env.DISCORD_PUBLIC_CHANNEL
            .split(",").map(id => id.trim())
        this.officerChannels = process.env.DISCORD_OFFICER_CHANNEL
            .split(",").map(id => id.trim())
        this.officerRoles = process.env.DISCORD_COMMAND_ROLE
            .split(",").map(id => id.trim())

        let self = this

        this.app.on("*.chat", async ({clientInstance, scope, channelId, username, replyUsername, message}) => {
            // discord instance now supports different channels using same instance
            // if (clientInstance === this) return


            // webhooks received in same channel
            if (instanceType(clientInstance) === LOCATION.WEBHOOK) return


            let channels
            if (scope === SCOPE.PUBLIC) channels = this.publicChannels
            else if (scope === SCOPE.OFFICER) channels = this.officerChannels
            else return

            for (const _channelId of channels) {
                if (_channelId === channelId) continue

                let webhook = await this.#getWebhook(_channelId)
                let displayUsername = replyUsername ? `${username}⇾${replyUsername}` : username

                //TODO: integrate instanceName
                await webhook.send({
                    content: escapeDiscord(message),
                    username: displayUsername,
                    avatarURL: `https://mc-heads.net/avatar/${username}`
                })
            }
        })

        let lastRepeatEvent = 0
        let lastBlockEvent = 0
        this.app.on("*.event.*", async function ({clientInstance, scope, username, severity, message, removeLater}) {
            if (clientInstance === this) return

            if (this.event === "minecraft.event.repeat") {
                if (lastRepeatEvent + 5000 < new Date().getTime()) {
                    lastRepeatEvent = new Date().getTime()
                } else {
                    return
                }
            }
            if (this.event === "minecraft.event.block") {
                if (lastBlockEvent + 5000 < new Date().getTime()) {
                    lastBlockEvent = new Date().getTime()
                } else {
                    return
                }
            }

            let channels
            if (scope === SCOPE.PUBLIC) channels = self.publicChannels
            else if (scope === SCOPE.OFFICER) channels = self.officerChannels
            else return

            for (const channelId of channels) {
                let channel = await self.client.channels.fetch(channelId)

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
                    let deleteAfter = self.#clientOptions["events"]["deleteTempEventAfter"]
                    setTimeout(() => resP.then(res => res.delete()), deleteAfter)
                }
            }
        })

        this.app.on("*.client.*", async function ({clientInstance, reason}) {
            if (clientInstance === this) return

            for (const channelId of self.publicChannels) {
                let channel = await self.client.channels.fetch(channelId)
                channel.send({
                    embeds: [{
                        title: escapeDiscord(clientInstance?.instanceName || "Main"),
                        description: reason ? escapeDiscord(reason) : escapeDiscord(this.event),
                        color: COLOR.INFO
                    }]
                });
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