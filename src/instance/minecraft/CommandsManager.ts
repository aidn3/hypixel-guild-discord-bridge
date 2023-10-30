import { LOCATION, SCOPE } from '../../common/ClientInstance'
import { ColorScheme } from '../discord/common/DiscordConfig'
import EventHandler from '../../common/EventHandler'
import { EventType } from '../../common/ApplicationEvent'
import { ChatCommandHandler } from './common/ChatInterface'

import MinecraftInstance from './MinecraftInstance'
import CalculateCommand from './commands/CalculateCommand'
import CataCommand from './commands/CataCommand'
import EightBallCommand from './commands/EightBallCommand'
import ExplainCommand from './commands/ExplainCommand'
import GuildCommand from './commands/GuildCommand'
import IqCommand from './commands/IqCommand'
import KuudraCommand from './commands/KuudraCommand'
import LevelCommand from './commands/LevelCommand'
import NetworthCommand from './commands/NetworthCommand'
import RockPaperScissorsCommand from './commands/RockPaperScissorsCommand'
import RouletteCommand from './commands/RouletteCommand'
import SecretsCommand from './commands/SecretsCommand'
import SkillCommand from './commands/SkillCommand'
import RunsCommand from './commands/RunsCommand'
import SlayerCommand from './commands/SlayerCommand'
import WeightCommand from './commands/WeightCommand'

export class CommandsManager extends EventHandler<MinecraftInstance> {
  private readonly commands: ChatCommandHandler[]

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)

    this.commands = [
      CalculateCommand,
      CataCommand,
      EightBallCommand,
      ExplainCommand,
      GuildCommand,
      IqCommand,
      KuudraCommand,
      LevelCommand,
      NetworthCommand,
      RockPaperScissorsCommand,
      RouletteCommand,
      RunsCommand,
      SecretsCommand,
      SkillCommand,
      SlayerCommand,
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

    const commandName = message.slice(minecraftInstance.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const arguments_ = message.split(' ').slice(1)

    if (commandName === 'toggle' && username === minecraftInstance.config.adminUsername && arguments_.length > 0) {
      const command = this.commands.find((c) => c.triggers.includes(arguments_[0]))
      if (command == undefined) return false

      command.enabled = !command.enabled
      await minecraftInstance.send(
        `/gc @Command ${command.triggers[0]} is now ${command.enabled ? 'enabled' : 'disabled'}.`
      )
      return true
    }

    if (['help', 'command', 'commands', 'cmd', 'cmds'].includes(commandName)) {
      if (arguments_.length <= 0) {
        const reply = `Commands: ${this.commands.map((command) => command.name).join(', ')}`
        await minecraftInstance.send(`/gc ${reply}`)

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
        return true
      }
      const command = this.commands.find((c) => c.triggers.includes(arguments_[0]?.toLowerCase()))
      if (command == undefined) {
        const reply = `That command does not exist, use ${minecraftInstance.config.commandPrefix}help`
        await minecraftInstance.send(`/gc ${reply}`)

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
        return true
      }

      const reply =
        `${command.name}: ${command.description} ` +
        `(${minecraftInstance.config.commandPrefix}${command.example.replaceAll('%s', username)})`
      await minecraftInstance.send(`/gc ${reply}`)

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
      return true
    }

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined || !command.enabled) return false

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
      args: arguments_
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
