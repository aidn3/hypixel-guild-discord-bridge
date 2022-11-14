const logger = require("log4js")

class ClientInstance {
    instanceName
    app
    logger

    constructor(app, instanceName) {
        this.app = app
        this.instanceName = instanceName
        this.logger = logger.getLogger(instanceName)
    }

    async connect() {
        throw new Error("method not implemented yet")
    }
}

const LOCATION = {DISCORD: "discord", MINECRAFT: "minecraft", WEBHOOK: "webhook", GLOBAL: "global"}
const SCOPE = {OFFICER: "officer", PUBLIC: "public", PRIVATE: "private"}

function instanceType(instance) {
    //TODO: find better way than hardcoded.
    // can't just do "instance of require(DiscordInstance)"
    // DiscordInstance itself requires THIS module
    // it gives the error:
    // Warning: Accessing non-existent property 'sendMetric' of module exports inside circular dependency

    if (instance.constructor.name === "DiscordInstance") return LOCATION.DISCORD
    if (instance.constructor.name === "MinecraftInstance") return LOCATION.MINECRAFT
    if (instance.constructor.name === "WebhookInstance") return LOCATION.WEBHOOK
    if (instance.constructor.name === "GlobalChatInstance") return LOCATION.GLOBAL

    throw  new Error(`${instance} can't be recognized.`)
}


module.exports = {ClientInstance, instanceType, LOCATION, SCOPE}