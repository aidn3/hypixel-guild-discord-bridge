const EventEmitter = require("eventemitter2")
const Hypixel = require("hypixel-api-reborn")
const DiscordInstance = require("./discord/DiscordInstance")
const MinecraftInstance = require("./minecraft/MinecraftInstance")
const GlobalChatInstance = require("./globalChat/GlobalChatInstance")
const WebhookInstance = require("./webhook/WebhookInstance")
const PunishedUsers = require("./util/MutedUsers")

const DISCORD_CONFIG = require("../config/discord-config.json")
const MINECRAFT_CONFIG = require("../config/minecraft-config.json")
const fs = require("fs");
const HYPIXEL_KEY = process.env.HYPIXEL_KEY

class Application extends EventEmitter {
    hypixelApi
    punishedUsers
    plugins

    discordInstance
    globalChatInstance
    minecraftInstances = []
    webhookInstances = []

    constructor() {
        super({wildcard: true})

        this.hypixelApi = new Hypixel.Client(HYPIXEL_KEY, {cache: true, cacheTime: 300})
        this.punishedUsers = new PunishedUsers()

        this.discordInstance = new DiscordInstance(this, "DC", DISCORD_CONFIG)
        this.globalChatInstance = new GlobalChatInstance(this, "GLOBAL")
        this.#parseWebhooks()
        this.#parseMinecraft()

        this.#loadPlugins()
        this.plugins.forEach(p => p.call(null, this))
    }

    sendMinecraftCommand(command) {
        this.minecraftInstances.forEach(inst => inst.send(command))
    }

    isMinecraftBot(username) {
        return this.minecraftInstances.some(inst => inst.username() === username)
    }

    async connect() {
        await this.discordInstance.connect()
        await this.globalChatInstance.connect()
        for (let instance of this.minecraftInstances) {
            //TODO: instance will try to connect but won't be "ready" to receive events
            // NEED TO CHANGE MinecraftInstance#connect()
            await instance.connect()
        }

        this.emit("main.client.start", {
            clientInstance: null,
            reason: "Bridge has started."
        })
    }

    #loadPlugins() {
        this.plugins = fs.readdirSync('./src/plugins/')
            .filter(file => file.endsWith('Plugin.js'))
            .map(f => require(`./plugins/${f}`))
    }

    #parseMinecraft() {
        for (let envKey in process.env) {
            if (envKey.startsWith("MINECRAFT_")) {
                let account = process.env[envKey].split(",")
                let options = {
                    auth: account.shift(),
                    username: account.shift(),
                    password: account.join(","),
                }

                Object.assign(options, MINECRAFT_CONFIG.server)
                let instanceName = envKey.replace("MINECRAFT_", "")

                let instance = new MinecraftInstance(
                    this,
                    instanceName,
                    options
                )

                this.minecraftInstances.push(instance)
            }
        }
    }

    #parseWebhooks() {
        for (let envKey in process.env) {
            if (envKey.startsWith("WEBHOOK_")) {
                let webhookInfo = process.env[envKey].split(",")
                let webhookSendUrl = webhookInfo[1], webhookReceiveId = webhookInfo[0]
                let instanceName = envKey.replace("WEBHOOK_", "")

                let instance = new WebhookInstance(
                    this,
                    instanceName,
                    this.discordInstance,
                    webhookSendUrl,
                    webhookReceiveId
                )

                this.webhookInstances.push(instance)
            }
        }
    }
}

module.exports = new Application()