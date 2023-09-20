import MinecraftInstance from './MinecraftInstance'
import { LOCATION, SCOPE } from '../../common/ClientInstance'
import { ColorScheme } from '../discord/common/DiscordConfig'
import { ChatCommandHandler } from './common/ChatInterface'
import EventHandler from '../../common/EventHandler'
import { EventType } from '../../common/ApplicationEvent'
import BitchesCommand from './commands/BitchesCommand'
import CalculateCommand from './commands/CalculateCommand'
import CataCommand from './commands/CataCommand'
import EightBallCommand from './commands/EightBallCommand'
import ExplainCommand from './commands/ExplainCommand'
import GuildCommand from './commands/GuildCommand'
import IqCommand from './commands/IqCommand'
import LevelCommand from './commands/LevelCommand'
import NetworthCommand from './commands/NetworthCommand'
import RockPaperScissorsCommand from './commands/RockPaperScissorsCommand'
import RouletteCommand from './commands/RouletteCommand'
import SkillCommand from './commands/SkillCommand'
import WeightCommand from './commands/WeightCommand'

export class CommandsManager extends EventHandler<MinecraftInstance> {
  private readonly commands: ChatCommandHandler[]

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)

    this.commands = [
      BitchesCommand,
      CalculateCommand,
      CataCommand,
      EightBallCommand,
      ExplainCommand,
      ExplainCommand,
      GuildCommand,
      IqCommand,
      LevelCommand,
      NetworthCommand,
      RockPaperScissorsCommand,
      RouletteCommand,
      SkillCommand,
      WeightCommand
    ]

    const disabled = clientInstance.config.disabledCommand
    for (const command of this.commands) {
      if (command.triggers.some((trigger: string) => disabled.includes(trigger.toLowerCase()))) {
        command.enabled = false
      }
    }
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

    const reply = await command.handler({
      clientInstance: minecraftInstance,
      username,
      args
    })

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
}
