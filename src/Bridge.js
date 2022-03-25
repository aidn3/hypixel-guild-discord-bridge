const log4js = require("log4js")
const PunishedUsers = require("./MutedUsers");

const DISPLAY_INSTANCE_NAME = require('../config/cluster-config.json').displayInstanceName
const DISCORD_PUBLIC_CHANNEL = process.env.DISCORD_PUBLIC_CHANNEL
const DISCORD_OFFICER_CHANNEL = process.env.DISCORD_OFFICER_CHANNEL

const publicChatLogger = log4js.getLogger("Public-Chat")
const publicEventLogger = log4js.getLogger("Public-Event")
const officerChatLogger = log4js.getLogger("Officer-Chat")
const officerEventLogger = log4js.getLogger("Officer-Event")


const escapeDiscord = function (message) {
    if (!message) return ""

    message = message.split('_').join('\\_') // Italic
    message = message.split('*').join('\\*') // bold
    message = message.split('~').join('\\~') // strikethrough
    message = message.split('`').join('\\`') // code
    message = message.split('@').join('\\@-') // mentions

    return message
}

class Bridge {
    punishedUsers;
    discordInstance;
    minecraftInstances = [];
    #discordOptions;

    constructor(discordOptions) {
        this.#discordOptions = discordOptions
        this.punishedUsers = new PunishedUsers()
    }

    onOfficerEvent(instance, username, message, color, isTemp) {
        officerEventLogger.info(`[${instance.instanceName}] ${username}: ${message}`)

        this.#sendMinecraftChat(instance, "oc", "", message)
        this.#sendDiscordEvent(instance, DISCORD_OFFICER_CHANNEL, username, message, color, isTemp)
    }

    onPublicEvent(instance, username, message, color, isTemp) {
        publicEventLogger.info(`[${instance.instanceName}] ${username}: ${message}`)

        this.#sendMinecraftChat(instance, "gc", "", message)
        this.#sendDiscordEvent(instance, DISCORD_PUBLIC_CHANNEL, username, message, color, isTemp)
    }

    onPublicChatMessage(instance, username, message) {
        publicChatLogger.info(`[${instance.instanceName}] ${username}: ${message}`)

        this.#sendMinecraftChat(instance, "gc", username, message)
        this.#sendDiscordChat(instance, DISCORD_PUBLIC_CHANNEL, username, message)
    }

    onOfficerChatMessage(instance, username, message) {
        officerChatLogger.info(`[${instance.instanceName}] ${username}: ${message}`)

        this.#sendMinecraftChat(instance, "oc", username, message)
        this.#sendDiscordChat(instance, DISCORD_OFFICER_CHANNEL, username, message)
    }

    sendMinecraftCommand(command) {
        this.minecraftInstances.forEach(inst => inst.send(command))
    }

    isMinecraftBot(username) {
        return this.minecraftInstances.some(inst => inst.username() === username)
    }

    #sendMinecraftChat(instance, prefix, username, message) {
        let full = `/${prefix} `
        if (DISPLAY_INSTANCE_NAME) full += `[${instance.instanceName}] `
        full += `${username}: ${message}`

        this.minecraftInstances
            .filter(inst => inst !== instance)
            .forEach(inst => inst.send(full))
    }

    #sendDiscordChat(instance, channelId, username, message) {
        if (instance !== this.discordInstance) {
            this.discordInstance.client.channels
                .fetch(channelId)
                .then(channel => {
                    let escaped = `**`
                    if (DISPLAY_INSTANCE_NAME) escaped += `[${escapeDiscord(instance.instanceName)}] `
                    escaped += escapeDiscord(username) + `:** ` + escapeDiscord(message)

                    channel.send(escaped)
                })
        }
    }

    #sendDiscordEvent(instance, channelId, username, message, color, isTemp) {
        if (instance !== this.discordInstance) {
            this.discordInstance.client.channels
                .fetch(channelId)
                .then(channel => {
                    let discordMessage = {
                        title: escapeDiscord(username),
                        description: escapeDiscord(message),
                        url: `https:\/\/sky.shiiyu.moe\/stats\/${username}`,
                        thumbnail: {url: `https://cravatar.eu/helmavatar/${username}.png`},
                        color: color
                    }

                    let resP = channel.send({embeds: [discordMessage]})
                    if (isTemp) {
                        let deleteAfter = this.#discordOptions.events.deleteTempEventAfter
                        setTimeout(() => resP.then(res => res.delete()), deleteAfter)
                    }
                })
        }
    }
}

module.exports = Bridge