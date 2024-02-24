import { ClientInstance } from '../../common/client-instance'
import type { ChatEvent } from '../../common/application-event'
import { ChannelType, InstanceType } from '../../common/application-event'
import type Application from '../../application'
import type { CommandsConfig } from '../../application-config'
import Calculate from './triggers/calculate'
import Catacomb from './triggers/catacomb'
import EightBallCommand from './triggers/8ball'
import Explain from './triggers/explain'
import Guild from './triggers/guild'
import Iq from './triggers/iq'
import Kuudra from './triggers/kuudra'
import Level from './triggers/level'
import Networth from './triggers/networth'
import RockPaperScissors from './triggers/rock-paper-scissors'
import Roulette from './triggers/roulette'
import Secrets from './triggers/secrets'
import Skills from './triggers/skills'
import Runs from './triggers/runs'
import Slayer from './triggers/slayer'
import Weight from './triggers/weight'
import Help from './triggers/help'
import Override from './triggers/override'
import Toggle from './triggers/toggle'
import type { ChatCommandHandler } from './common/command-interface'

export class CommandsInstance extends ClientInstance<CommandsConfig> {
  private readonly commands: ChatCommandHandler[]

  constructor(app: Application, instanceName: string, config: CommandsConfig) {
    super(app, instanceName, InstanceType.COMMANDS, config)

    this.commands = [
      new Calculate(),
      new Catacomb(),
      new EightBallCommand(),
      new Explain(),
      new Guild(),
      new Help(),
      new Iq(),
      new Kuudra(),
      new Level(),
      new Networth(),
      new Override(),
      new RockPaperScissors(),
      new Roulette(),
      new Runs(),
      new Secrets(),
      new Skills(),
      new Slayer(),
      new Toggle(),
      new Weight()
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

    const isAdmin = event.username === this.config.adminUsername && event.instanceType === InstanceType.MINECRAFT
    const commandName = event.message.slice(this.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const commandsArguments = event.message.split(' ').slice(1)

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) return

    // officer chat and application owner can bypass enabled flag
    if (!command.enabled && !isAdmin && event.channelType !== ChannelType.OFFICER) {
      return
    }

    const commandResponse = await command.handler({
      app: this.app,

      allCommands: this.commands,
      commandPrefix: this.config.commandPrefix,
      adminUsername: this.config.adminUsername,

      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,

      username: event.username,
      isAdmin: isAdmin,
      args: commandsArguments
    })

    this.app.emit('command', {
      localEvent: true,
      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,
      discordChannelId: event.channelId,
      username: event.username,
      fullCommand: event.message,
      commandName: command.triggers[0],
      commandResponse: commandResponse,
      alreadyReplied: false
    })
  }
}
