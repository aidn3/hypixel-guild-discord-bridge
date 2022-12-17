import fs = require("fs")
import MinecraftInstance from "./MinecraftInstance"
import {ClientEvent, CommandEvent} from "../../common/ApplicationEvent"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import {ColorScheme} from "../discord/common/DiscordConfig"
import {MinecraftCommandMessage} from "./common/ChatInterface";
import EventHandler from "../../common/EventHandler";


export class CommandsManager extends EventHandler<MinecraftInstance> {
    private readonly commands: MinecraftCommandMessage[]

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)

        this.commands = fs.readdirSync('./src/instance/minecraft/commands')
            .filter((file: string) => file.endsWith('Command.ts'))
            .map((f: string) => {
                clientInstance.logger.trace(`Loading command ${f}`)
                return require(`./commands/${f}`).default
            })
            .filter(command => !command.triggers.some((trigger: string) => clientInstance.config.disabledCommand.includes(trigger.toLowerCase())))
    }


    async publicCommandHandler(minecraftInstance: MinecraftInstance, username: string, message: string): Promise<boolean> {
        if (!message.startsWith(minecraftInstance.config.commandPrefix)) return false

        let commandName = message.substring(minecraftInstance.config.commandPrefix.length).split(" ")[0].toLowerCase()
        let args = message.split(" ").slice(1)

        if (commandName === "toggle" && username === minecraftInstance.config.adminUsername && args.length > 0) {
            let command = this.commands.find(c => c.triggers.some((t: string) => t === args[0]))
            if (!command) return false

            command.enabled = !command.enabled
            await minecraftInstance.send(`/gc @Command ${command.triggers[0]} is now ${command.enabled ? "enabled" : "disabled"}.`)
            return true
        }

        let command = this.commands.find(c => c.triggers.some((t: string) => t === commandName))
        if (!command || !command.enabled) return false

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

    async privateCommandHandler(minecraftInstance: MinecraftInstance, username: string, message: string): Promise<void> {
        if (username !== minecraftInstance.config.adminUsername) return

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

    registerEvents(): void {
    }
}

