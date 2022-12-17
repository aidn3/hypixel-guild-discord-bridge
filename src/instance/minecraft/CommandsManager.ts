import fs = require("fs")
import MinecraftInstance from "./MinecraftInstance"
import {ClientEvent, CommandEvent} from "../../common/ApplicationEvent"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import {ColorScheme} from "../discord/common/DiscordConfig";

const COMMANDS_CONFIG = require('../../../config/minecraft-config.json').commands
const HYPIXEL_COMMAND_PREFIX = COMMANDS_CONFIG.prefix
const DISABLED_COMMANDS = COMMANDS_CONFIG.disabled.map((commandName: string) => commandName.toLowerCase())

const commands = fs.readdirSync('./src/instance/minecraft/commands')
    .filter((file: string) => file.endsWith('Command.ts'))
    .map((f: string) => require(`./commands/${f}`).default)
    .filter(command => !command.triggers.some((trigger: string) => DISABLED_COMMANDS.includes(trigger.toLowerCase())))
commands.forEach(c => console.log(`Loaded command ${c.triggers[0]}`))

const HYPIXEL_OWNER_USERNAME = process.env.HYPIXEL_OWNER_USERNAME


export async function publicCommandHandler(minecraftInstance: MinecraftInstance, username: string, message: string): Promise<boolean> {
    if (!message.startsWith(HYPIXEL_COMMAND_PREFIX)) return false

    let commandName = message.substring(HYPIXEL_COMMAND_PREFIX.length).split(" ")[0].toLowerCase()
    let args = message.split(" ").slice(1)

    if (commandName === "toggle" && username === HYPIXEL_OWNER_USERNAME && args.length > 0) {
        let command = commands.find(c => c.triggers.some((t: string) => t === args[0]))
        if (!command) return false

        command.disabled = !command.disabled
        await minecraftInstance.send(`/gc @Command ${command.triggers[0]} is now ${command.disabled ? "disabled" : "enabled"}.`)
        return true
    }

    let command = commands.find(c => c.triggers.some((t: string) => t === commandName))
    if (!command || command.disabled) return false

    minecraftInstance.app.emit("command", <CommandEvent>{
        instanceName: minecraftInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        username: username,
        fullCommand: message,
        commandName: commandName
    })

    let reply = await command.handler(minecraftInstance, username, args)
    await minecraftInstance.send(`/gc ${reply}`)

    minecraftInstance.app.emit("event", <ClientEvent>{
        instanceName: minecraftInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: "command",
        username: username,
        severity: ColorScheme.GOOD,
        message: `${message}\n${reply}`,
        removeLater: false
    })

    return true
}

export async function privateCommandHandler(minecraftInstance: MinecraftInstance, username: string, message: string): Promise<void> {
    if (username !== HYPIXEL_OWNER_USERNAME) return

    minecraftInstance.logger.debug(`${username} executed from private chat: ${message}`)

    minecraftInstance.app.emit("command", <CommandEvent>{
        instanceName: minecraftInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PRIVATE,
        username: username,
        fullCommand: message,
        commandName: "override"
    })

    return await minecraftInstance.send(message)
}
