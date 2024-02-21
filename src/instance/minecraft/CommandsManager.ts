import { LOCATION, SCOPE } from '../../common/ClientInstance'
import EventHandler from '../../common/EventHandler'
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
import HelpCommand from './commands/HelpCommand'
import OverrideCommand from './commands/OverrideCommand'
import ToggleCommand from './commands/ToggleCommand'

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
      HelpCommand,
      IqCommand,
      KuudraCommand,
      LevelCommand,
      NetworthCommand,
      OverrideCommand,
      RockPaperScissorsCommand,
      RouletteCommand,
      RunsCommand,
      SecretsCommand,
      SkillCommand,
      SlayerCommand,
      ToggleCommand,
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
    scope: SCOPE,
    username: string,
    message: string
  ): Promise<boolean> {
    if (!message.startsWith(minecraftInstance.config.commandPrefix)) return false

    const commandName = message.slice(minecraftInstance.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const arguments_ = message.split(' ').slice(1)

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) return false

    if (!command.enabled && this.clientInstance.config.adminUsername !== username && scope !== SCOPE.OFFICER) {
      // officer chat and bot owner can bypass enabled flag
      return true
    }

    const commandResponse = await command.handler({
      clientInstance: minecraftInstance,
      allCommands: this.commands,
      scope: scope,
      username,
      args: arguments_
    })

    if (scope === SCOPE.PRIVATE) {
      await minecraftInstance.send(`/msg ${username} ${commandResponse}`)
    }

    minecraftInstance.app.emit('command', {
      localEvent: true,
      instanceName: minecraftInstance.instanceName,
      location: LOCATION.MINECRAFT,
      scope: scope,
      username,
      fullCommand: message,
      commandName: command.triggers[0],
      commandResponse: commandResponse
    })

    return true
  }
}
