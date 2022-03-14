const Bridge = require("./Bridge")
const DiscordInstance = require("./discord/DiscordInstance")
const MinecraftInstance = require("./minecraft/MinecraftInstance")
const HypixelGuild = require("./guild/HypixelGuild")

const DISCORD_CONFIG = require("../config/discord-config.json")
const MINECRAFT_CONFIG = require("../config/minecraft-config.json")

class Application {
    constructor() {
        this.bridge = new Bridge(DISCORD_CONFIG)
        this.hypixelGuild = new HypixelGuild(this.bridge)

        this.bridge.discordInstance = new DiscordInstance("DC", this.bridge, DISCORD_CONFIG.cache)

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
    }

    connect() {
        this.bridge.discordInstance.connect()
        this.bridge.minecraftInstances.forEach(instance => instance.connect())
    }
}

module.exports = new Application()