import type Application from '../../application.js'
import type { ChatEvent } from '../../common/application-event.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import type { ChatCommandHandler } from '../../common/commands.js'
import { ConfigManager } from '../../common/config-manager.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import { InternalInstancePrefix } from '../../common/instance.js'

import EightBallCommand from './triggers/8ball.js'
import Bedwars from './triggers/bedwars.js'
import Bits from './triggers/bits.js'
import Calculate from './triggers/calculate.js'
import Catacomb from './triggers/catacomb.js'
import DarkAuction from './triggers/darkauction.js'
import Explain from './triggers/explain.js'
import Guild from './triggers/guild.js'
import Help from './triggers/help.js'
import Iq from './triggers/iq.js'
import Kuudra from './triggers/kuudra.js'
import Level from './triggers/level.js'
import MagicalPower from './triggers/magicalpower.js'
import Networth from './triggers/networth.js'
import Override from './triggers/override.js'
import PartyManager from './triggers/party.js'
import PersonalBest from './triggers/personal-best.js'
import RockPaperScissors from './triggers/rock-paper-scissors.js'
import Roulette from './triggers/roulette.js'
import RunsToClassAverage from './triggers/runs-to-class-average.js'
import Runs from './triggers/runs.js'
import Secrets from './triggers/secrets.js'
import Skills from './triggers/skills.js'
import Slayer from './triggers/slayer.js'
import Soopy from './triggers/soopy.js'
import StatusCommand from './triggers/status.js'
import Toggle from './triggers/toggle.js'
import Vengeance from './triggers/vengeance.js'
import Weight from './triggers/weight.js'

export class CommandsInstance extends ConnectableInstance<InstanceType.Commands> {
  private static readonly CommandPrefix: string = '!'
  public readonly commands: ChatCommandHandler[]
  private readonly internalConfig

  constructor(app: Application) {
    super(app, InternalInstancePrefix + InstanceType.Commands, InstanceType.Commands)

    this.internalConfig = new ConfigManager<InternalConfig>(app, app.getConfigFilePath('commands.json'), {
      disabledCommands: []
    })
    this.internalConfig.loadFromConfig()

    this.commands = [
      new Bits(),
      new Bedwars(),
      new Calculate(),
      new Catacomb(),
      new DarkAuction(),
      new EightBallCommand(),
      new Explain(),
      new Guild(),
      new Help(),
      new Iq(),
      new Kuudra(),
      new Level(),
      new MagicalPower(),
      new Networth(),
      new Override(),
      ...new PartyManager().resolveCommands(),
      new PersonalBest(),
      new RockPaperScissors(),
      new Roulette(),
      new Runs(),
      new RunsToClassAverage(),
      new Secrets(),
      new Skills(),
      new Slayer(),
      new Soopy(),
      new StatusCommand(),
      new Toggle(),
      new Vengeance(),
      new Weight()
    ]

    const disabled = this.internalConfig.data.disabledCommands
    for (const command of this.commands) {
      if (command.triggers.some((trigger: string) => disabled.includes(trigger.toLowerCase()))) {
        command.enabled = false
      }
    }
    this.checkCommandsIntegrity()

    this.application.on('chat', (event) => {
      void this.handle(event).catch(this.errorHandler.promiseCatch('handling chat event'))
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

  connect(): void {
    this.checkCommandsIntegrity()
    this.setAndBroadcastNewStatus(Status.Connected, 'chat commands are ready to serve')
  }

  disconnect(): Promise<void> | void {
    this.setAndBroadcastNewStatus(Status.Ended, 'chat commands have been disabled')
  }

  async handle(event: ChatEvent): Promise<void> {
    if (this.currentStatus() !== Status.Connected) return
    if (!event.message.startsWith(CommandsInstance.CommandPrefix)) return

    const commandName = event.message.slice(CommandsInstance.CommandPrefix.length).split(' ')[0].toLowerCase()
    const commandsArguments = event.message.split(' ').slice(1)

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) return

    // Disabled commands can only be used by officers and admins, regular users cannot use them
    if (!command.enabled && event.permission === Permission.Anyone) {
      return
    }

    try {
      const commandResponse = await command.handler({
        app: this.application,

        eventHelper: this.eventHelper,
        logger: this.logger,
        errorHandler: this.errorHandler,

        allCommands: this.commands,
        commandPrefix: CommandsInstance.CommandPrefix,
        saveConfigChanges: () => {
          this.saveConfig()
        },

        instanceName: event.instanceName,
        instanceType: event.instanceType,
        channelType: event.channelType,

        username: event.username,
        permission: event.permission,
        args: commandsArguments,

        sendFeedback: (feedbackResponse) => {
          this.feedback(event, command.triggers[0], feedbackResponse)
        }
      })

      this.reply(event, command.triggers[0], commandResponse)
    } catch (error) {
      this.logger.error('Error while handling command', error)
      this.reply(
        event,
        command.triggers[0],
        `${event.username}, an error occurred while trying to execute ${command.triggers[0]}.`
      )
    }
  }

  private reply(event: ChatEvent, commandName: string, response: string): void {
    this.application.emit('command', {
      eventId: this.eventHelper.generate(),
      instanceName: event.instanceName,
      instanceType: event.instanceType,

      originEventId: event.eventId,
      username: event.username,
      commandName: commandName,
      commandResponse: response
    })
  }

  private feedback(event: ChatEvent, commandName: string, response: string): void {
    this.application.emit('commandFeedback', {
      eventId: this.eventHelper.generate(),
      instanceName: event.instanceName,
      instanceType: event.instanceType,

      originEventId: event.eventId,
      username: event.username,
      commandName: commandName,
      commandResponse: response
    })
  }

  private saveConfig(): void {
    this.internalConfig.data.disabledCommands = this.commands
      .filter((command) => !command.enabled)
      .map((command) => command.triggers[0])
    this.internalConfig.saveConfig()
  }
}

export interface InternalConfig {
  disabledCommands: string[]
}
