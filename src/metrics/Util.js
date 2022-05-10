const LOCATION = {DISCORD: "discord", MINECRAFT: "minecraft", WEBHOOK: "webhook"}
const SCOPE = {OFFICER: "officer", PUBLIC: "public", PRIVATE: "private"}

function getLocation(instance) {
    //TODO: find better way than hardcoded.
    // can't just do "instance of require(DiscordInstance)"
    // DiscordInstance itself requires THIS module
    // it gives the error:
    // Warning: Accessing non-existent property 'sendMetric' of module exports inside circular dependency

    if (instance.constructor.name === "DiscordInstance") return LOCATION.DISCORD
    if (instance.constructor.name === "MinecraftInstance") return LOCATION.MINECRAFT
    if (instance.constructor.name === "WebhookInstance") return LOCATION.WEBHOOK

    throw  new Error(`${instance} can't be recognized.`)
}

module.exports = {getLocation, LOCATION, SCOPE}