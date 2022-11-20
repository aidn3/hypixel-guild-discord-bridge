const fs = require("fs")
const CommandMetrics = require("../metrics/CommandMetrics")
const {SCOPE, instanceType} = require("../common/ClientInstance")

const COMMANDS_CONFIG = require('../../config/minecraft-config.json').commands
const HYPIXEL_COMMAND_PREFIX = COMMANDS_CONFIG.prefix
const DISABLED_COMMANDS = COMMANDS_CONFIG.disabled.map(commandName => commandName.toLowerCase())

const commands = fs.readdirSync('./src/minecraft/commands')
    .filter(file => file.endsWith('Command.js'))
    .map(f => require(`./commands/${f}`))
    .filter(command => !command.triggers.some(trigger => DISABLED_COMMANDS.includes(trigger.toLowerCase())))
commands.forEach(c => console.log(`Loaded command ${c.triggers[0]}`))

const HYPIXEL_COMMAND_PREFIX = require('../../config/minecraft-config.json').commands.prefix
const HYPIXEL_OWNER_USERNAME = process.env.HYPIXEL_OWNER_USERNAME


const publicCommandHandler = async function (minecraftInstance, username, message) {
    if (!message.startsWith(HYPIXEL_COMMAND_PREFIX)) return false

    let commandName = message.substring(HYPIXEL_COMMAND_PREFIX.length).split(" ")[0].toLowerCase()
    let args = message.split(" ").slice(1)

    let command = commands.find(c => c.triggers.some(t => t === commandName))
    if (command) {
        minecraftInstance.app.emit(["minecraft", "command", command.triggers[0]], {
            clientInstance: minecraftInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            fullCommand: message
        })

        let reply = await command.handler(minecraftInstance, username, args)
        minecraftInstance.send(`/gc ${reply}`)

        return true
    }
}

const privateCommandHandler = function (minecraftInstance, username, message) {
    if (username !== HYPIXEL_OWNER_USERNAME) return false

    minecraftInstance.logger.debug(`${username} executed from private chat: ${username}`)
    CommandMetrics(instanceType(minecraftInstance), SCOPE.PRIVATE, minecraftInstance.instanceName, null)
    minecraftInstance.send(message)
    return true
}

module.exports = {publicCommandHandler, privateCommandHandler}