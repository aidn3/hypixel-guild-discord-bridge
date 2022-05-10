const fs = require("fs")
const CommandMetrics = require("../metrics/CommandMetrics")
const {LOCATION, SCOPE, getLocation} = require("../metrics/Util");
const commands = fs.readdirSync('./src/minecraft/commands')
    .filter(file => file.endsWith('Command.js'))
    .map(f => require(`./commands/${f}`))

const HYPIXEL_COMMAND_PREFIX = require('../../config/minecraft-config.json').commands.prefix
const HYPIXEL_OWNER_USERNAME = process.env.HYPIXEL_OWNER_USERNAME


const publicCommandHandler = function (minecraftInstance, username, message) {
    if (!message.startsWith(HYPIXEL_COMMAND_PREFIX)) return

    let commandName = message.substring(HYPIXEL_COMMAND_PREFIX.length).split(" ")[0]
    let args = message.split(" ").slice(1)
    let reply = function (msg) {
        minecraftInstance.send(`/gc ${msg}`)
    }

    let command = commands.find(c => c.triggers.some(t => t === commandName))
    if (command) {
        minecraftInstance.logger.debug(`${username} executed command: ${message}`)
        CommandMetrics(LOCATION.MINECRAFT, SCOPE.PUBLIC, minecraftInstance.instanceName, command.triggers[0])
        command.handler(minecraftInstance, reply, username, args)
        return true
    }
}

const privateCommandHandler = function (minecraftInstance, username, message) {
    if (username !== HYPIXEL_OWNER_USERNAME) return

    minecraftInstance.logger.debug(`${username} executed from private chat: ${username}`)
    CommandMetrics(getLocation(minecraftInstance), SCOPE.PRIVATE, minecraftInstance.instanceName, null)
    minecraftInstance.send(message)
    return true
}

module.exports = {publicCommandHandler, privateCommandHandler}