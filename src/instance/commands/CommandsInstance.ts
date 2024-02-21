import { ClientInstance } from '../../common/ClientInstance'
import { ChatEvent, InstanceType, ChannelType } from '../../common/ApplicationEvent'
import Application from '../../Application'
import { CommandsConfig } from '../../ApplicationConfig'
import CalculateCommand from './triggers/CalculateCommand'
import CataCommand from './triggers/CataCommand'
import EightBallCommand from './triggers/EightBallCommand'
import ExplainCommand from './triggers/ExplainCommand'
import GuildCommand from './triggers/GuildCommand'
import IqCommand from './triggers/IqCommand'
import KuudraCommand from './triggers/KuudraCommand'
import LevelCommand from './triggers/LevelCommand'
import NetworthCommand from './triggers/NetworthCommand'
import RockPaperScissorsCommand from './triggers/RockPaperScissorsCommand'
import RouletteCommand from './triggers/RouletteCommand'
import SecretsCommand from './triggers/SecretsCommand'
import SkillCommand from './triggers/SkillCommand'
import RunsCommand from './triggers/RunsCommand'
import SlayerCommand from './triggers/SlayerCommand'
import WeightCommand from './triggers/WeightCommand'
import HelpCommand from './triggers/HelpCommand'
import OverrideCommand from './triggers/OverrideCommand'
import ToggleCommand from './triggers/ToggleCommand'
import { ChatCommandHandler } from './common/CommandInterface'

export class CommandsInstance extends ClientInstance<CommandsConfig> {
  private readonly commands: ChatCommandHandler[]

  constructor(app: Application, instanceName: string, config: CommandsConfig) {
    super(app, instanceName, InstanceType.COMMANDS, config)

    this.commands = [
      new CalculateCommand(),
      new CataCommand(),
      new EightBallCommand(),
      new ExplainCommand(),
      new GuildCommand(),
      new HelpCommand(),
      new IqCommand(),
      new KuudraCommand(),
      new LevelCommand(),
      new NetworthCommand(),
      new OverrideCommand(),
      new RockPaperScissorsCommand(),
      new RouletteCommand(),
      new RunsCommand(),
      new SecretsCommand(),
      new SkillCommand(),
      new SlayerCommand(),
      new ToggleCommand(),
      new WeightCommand()
    ]

    const disabled = config.disabledCommand
    for (const command of this.commands) {
      if (command.triggers.some((trigger: string) => disabled.includes(trigger.toLowerCase()))) {
        command.enabled = false
      }
    }
    this.checkCommandsIntegrity()

    this.app.on('chat', (event) => {
      void this.handle(event)
    })
  }

  private checkCommandsIntegrity(): void {
    const allTriggers = new Map<string, string>()
    for (const command of this.commands) {
      for (const trigger of command.triggers) {
        if (allTriggers.has(trigger)) {
          const alreadyDefinedCommandName = allTriggers.get(trigger)
          throw new Error(
            `Trigger already defined in ${alreadyDefinedCommandName} when trying to add it to ${command.name}`
          )
        } else {
          allTriggers.set(trigger, command.name)
        }
      }
    }
  }

  connect(): Promise<void> | void {
    this.checkCommandsIntegrity()
  }

  async handle(event: ChatEvent): Promise<void> {
    if (!event.message.startsWith(this.config.commandPrefix)) return

    const commandName = event.message.slice(this.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const commandsArguments = event.message.split(' ').slice(1)

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) return

    // officer chat and application owner can bypass enabled flag
    if (!command.enabled && this.config.adminUsername !== event.username && event.channelType !== ChannelType.OFFICER)
      return

    const commandResponse = await command.handler({
      app: this.app,

      allCommands: this.commands,
      commandPrefix: this.config.commandPrefix,
      adminUsername: this.config.adminUsername,

      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,
      username: event.username,
      args: commandsArguments
    })

    if (event.channelType === ChannelType.PRIVATE) {
      //TODO: await minecraftInstance.send(`/msg ${username} ${commandResponse}`)
    }

    this.app.emit('command', {
      localEvent: true,
      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,
      username: event.username,
      fullCommand: event.message,
      commandName: command.triggers[0],
      commandResponse: commandResponse
    })
  }
}
