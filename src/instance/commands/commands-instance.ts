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
import Boop from './triggers/boop.js'
import Calculate from './triggers/calculate.js'
import Catacomb from './triggers/catacomb.js'
import CurrentDungeon from './triggers/current-dungeon.js'
import DarkAuction from './triggers/darkauction.js'
import Election from './triggers/election.js'
import Execute from './triggers/execute.js'
import Explain from './triggers/explain.js'
import Guild from './triggers/guild.js'
import Help from './triggers/help.js'
import HeartOfTheMountain from './triggers/hotm.js'
import Iq from './triggers/iq.js'
import Kuudra from './triggers/kuudra.js'
import Level from './triggers/level.js'
import MagicalPower from './triggers/magicalpower.js'
import Mayor from './triggers/mayor.js'
import Networth from './triggers/networth.js'
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
import Starfall from './triggers/starfall.js'
import StatusCommand from './triggers/status.js'
import Toggle from './triggers/toggle.js'
import Vengeance from './triggers/vengeance.js'
import Warp from './triggers/warp.js'
import Weight from './triggers/weight.js'

export class CommandsInstance extends ConnectableInstance<InstanceType.Commands> {
  private static readonly CommandPrefix: string = '!'
  public readonly commands: ChatCommandHandler[]
  private readonly config: ConfigManager<CommandsConfig>

  constructor(app: Application) {
    super(app, InternalInstancePrefix + InstanceType.Commands, InstanceType.Commands)

    this.config = new ConfigManager(app, app.getConfigFilePath('commands.json'), {
      enabled: true,
      disabledCommands: []
    })

    this.commands = [
      new Bits(),
      new Bedwars(),
      new Boop(),
      new Calculate(),
      new Catacomb(),
      new CurrentDungeon(),
      new DarkAuction(),
      new Election(),
      new EightBallCommand(),
      new Execute(),
      new Explain(),
      new Guild(),
      new Help(),
      new HeartOfTheMountain(),
      new Iq(),
      new Kuudra(),
      new Level(),
      new MagicalPower(),
      new Mayor(),
      new Networth(),
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
      new Starfall(),
      new StatusCommand(),
      new Toggle(),
      new Vengeance(),
      new Warp(),
      new Weight()
    ]

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

  public getConfig(): ConfigManager<CommandsConfig> {
    return this.config
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
    if (
      this.config.data.disabledCommands.includes(command.triggers[0].toLowerCase()) &&
      event.permission === Permission.Anyone
    ) {
      return
    }

    try {
      const commandResponse = await command.handler({
        app: this.application,

        eventHelper: this.eventHelper,
        logger: this.logger,
        errorHandler: this.errorHandler,

        allCommands: this.commands,
        toggleCommand: (trigger) => {
          const command = this.commands.find((c) => c.triggers.includes(trigger.toLowerCase()))
          if (command == undefined) return 'not-found'

          const config = this.config.data
          if (config.disabledCommands.includes(command.triggers[0].toLowerCase())) {
            config.disabledCommands = config.disabledCommands.filter(
              (disabledCommand) => disabledCommand !== command.triggers[0].toLowerCase()
            )
            this.config.markDirty()
            return 'enabled'
          } else {
            config.disabledCommands.push(command.triggers[0].toLowerCase())
            this.config.markDirty()
            return 'disabled'
          }
        },
        commandPrefix: CommandsInstance.CommandPrefix,

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
}

export interface CommandsConfig {
  enabled: boolean
  disabledCommands: string[]
}
