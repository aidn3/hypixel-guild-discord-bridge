import fs = require('fs')
import MinecraftInstance from './MinecraftInstance'
import { LOCATION, SCOPE } from '../../common/ClientInstance'
import { ColorScheme } from '../discord/common/DiscordConfig'
import { MinecraftCommandMessage } from './common/ChatInterface'
import EventHandler from '../../common/EventHandler'
import { EventType } from '../../common/ApplicationEvent'

export class CommandsManager extends EventHandler<MinecraftInstance> {
  private readonly commands: MinecraftCommandMessage[]

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)

    this.commands = fs
      .readdirSync('./src/instance/minecraft/commands')
      .filter((file: string) => file.endsWith('Command.ts'))
      .map((f: string) => {
        clientInstance.logger.trace(`Loading command ${f}`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`./commands/${f}`).default
      })
      .filter(
        (command: MinecraftCommandMessage) =>
          !command.triggers.some((trigger: string) =>
            clientInstance.config.disabledCommand.includes(trigger.toLowerCase())
          )
      )
  }

  async publicCommandHandler(
    minecraftInstance: MinecraftInstance,
    username: string,
    message: string
  ): Promise<boolean> {
    if (!message.startsWith(minecraftInstance.config.commandPrefix)) return false

    const commandName = message.substring(minecraftInstance.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const args = message.split(' ').slice(1)

    if (commandName === 'toggle' && username === minecraftInstance.config.adminUsername && args.length > 0) {
      const command = this.commands.find((c) => c.triggers.some((t: string) => t === args[0]))
      if (command == null) return false

      command.enabled = !command.enabled
      await minecraftInstance.send(
        `/gc @Command ${command.triggers[0]} is now ${command.enabled ? 'enabled' : 'disabled'}.`
      )
      return true
    }

    const command = this.commands.find((c) => c.triggers.some((t: string) => t === commandName))
    if (command == null || !command.enabled) return false

    minecraftInstance.app.emit('command', {
      localEvent: true,
      instanceName: minecraftInstance.instanceName,
      location: LOCATION.MINECRAFT,
      scope: SCOPE.PUBLIC,
      username,
      fullCommand: message,
      commandName: command.triggers[0]
    })

    const reply = await command.handler(minecraftInstance, username, args)

    minecraftInstance.app.emit('event', {
      localEvent: true,
      instanceName: minecraftInstance.instanceName,
      location: LOCATION.MINECRAFT,
      scope: SCOPE.PUBLIC,
      name: EventType.COMMAND,
      username,
      severity: ColorScheme.GOOD,
      message: `${message}\n${reply}`,
      removeLater: false
    })

    minecraftInstance.app.emit('minecraftCommandResponse', {
      localEvent: true,
      instanceName: minecraftInstance.instanceName,
      location: LOCATION.MINECRAFT,
      username,
      commandName: command.triggers[0],
      fullCommand: message,
      commandResponse: reply
    })

    return true
  }

  async privateCommandHandler(minecraftInstance: MinecraftInstance, username: string, message: string): Promise<void> {
    if (username !== minecraftInstance.config.adminUsername) return

    minecraftInstance.logger.debug(`${username} executed from private chat: ${message}`)

    minecraftInstance.app.emit('command', {
      localEvent: true,
      instanceName: minecraftInstance.instanceName,
      location: LOCATION.MINECRAFT,
      scope: SCOPE.PRIVATE,
      username,
      fullCommand: message,
      commandName: 'override'
    })

    await minecraftInstance.send(message)
  }

  registerEvents(): void {}
}
