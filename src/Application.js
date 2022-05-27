const Bridge = require("./Bridge")
const DiscordInstance = require("./discord/DiscordInstance")
const MinecraftInstance = require("./minecraft/MinecraftInstance")
const WebhookInstance = require("./webhook/WebhookInstance")
const HypixelGuild = require("./guild/HypixelGuild")
const GuildApiMetrics = require("./metrics/GuildApiMetrics")
const GuildOnlineMetrics = require("./metrics/GuildOnlineMetrics")

const DISCORD_CONFIG = require("../config/discord-config.json")
const MINECRAFT_CONFIG = require("../config/minecraft-config.json")
const COLOR = require('../config/discord-config.json').events.color

class Application {
    constructor() {
        this.bridge = new Bridge(DISCORD_CONFIG)
        this.hypixelGuild = new HypixelGuild(this.bridge)

        this.bridge.discordInstance = new DiscordInstance("DC", this.bridge, DISCORD_CONFIG.cache)

        for (let envKey in process.env) {
            if (envKey.startsWith("WEBHOOK_")) {
                let webhookInfo = process.env[envKey].split(",")
                let instanceName = envKey.replace("WEBHOOK_", "")

                let instance = new WebhookInstance(instanceName, this.bridge, this.bridge.discordInstance, webhookInfo[1], webhookInfo[0])
                this.bridge.webhookInstances.push(instance)
            }
        }

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

                let instance = new MinecraftInstance(instanceName, this.bridge, options, this.hypixelGuild)
                this.bridge.minecraftInstances.push(instance)
            }
        }

        GuildApiMetrics(this.bridge)
        GuildOnlineMetrics(this.bridge)
    }

    async connect() {
        await this.bridge.discordInstance.connect()
        for (let instance of this.bridge.minecraftInstances) {
            //TODO: instance will try to connect but won't be "ready" to receive events
            // NEED TO CHANGE MinecraftInstance#connect()
            await instance.connect()
        }

        this.bridge.onPublicEvent(
            null,
            null,
            "Bridge has started.",
            COLOR.INFO,
            false)
    }
}

module.exports = new Application()