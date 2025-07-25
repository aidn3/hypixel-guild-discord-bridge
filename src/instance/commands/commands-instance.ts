import type Application from '../../application.js'
import type { ChatEvent } from '../../common/application-event.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import type { ChatCommandHandler } from '../../common/commands.js'
import { ConfigManager } from '../../common/config-manager.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import { InternalInstancePrefix } from '../../common/instance.js'

import EightBallCommand from './triggers/8ball.js'
import Api from './triggers/api.js'
import Asian from './triggers/asian.js'
import Bedwars from './triggers/bedwars.js'
import Bits from './triggers/bits.js'
import Boop from './triggers/boop.js'
import Calculate from './triggers/calculate.js'
import Catacomb from './triggers/catacomb.js'
import CurrentDungeon from './triggers/current-dungeon.js'
import DadJoke from './triggers/dadjoke.js'
import DarkAuction from './triggers/darkauction.js'
import DevelopmentExcuse from './triggers/devexcuse.js'
import Election from './triggers/election.js'
import Execute from './triggers/execute.js'
import Explain from './triggers/explain.js'
import Fetchur from './triggers/fetchur.js'
import Guild from './triggers/guild.js'
import Help from './triggers/help.js'
import HeartOfTheMountain from './triggers/hotm.js'
import Insult from './triggers/insult.js'
import Iq from './triggers/iq.js'
import Kuudra from './triggers/kuudra.js'
import Level from './triggers/level.js'
import List from './triggers/list.js'
import MagicalPower from './triggers/magicalpower.js'
import Mayor from './triggers/mayor.js'
import Mute from './triggers/mute.js'
import Networth from './triggers/networth.js'
import PartyManager from './triggers/party.js'
import PersonalBest from './triggers/personal-best.js'
import Points30days from './triggers/points-30days'
import PointsAll from './triggers/points-all'
import Purse from './triggers/purse.js'
import Reputation from './triggers/reputation.js'
import Rng from './triggers/rng.js'
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
import Timecharms from './triggers/timecharms.js'
import Toggle from './triggers/toggle.js'
import Toggled from './triggers/toggled.js'
import Unlink from './triggers/unlink.js'
import Vengeance from './triggers/vengeance.js'
import Warp from './triggers/warp.js'
import Weight from './triggers/weight.js'

export class CommandsInstance extends ConnectableInstance<InstanceType.Commands> {
  private static readonly CommandPrefix: string = '!'
  public readonly commands: ChatCommandHandler[]
  private readonly config: ConfigManager<CommandsConfig>

  constructor(app: Application) {
    super(app, InternalInstancePrefix + InstanceType.Commands, InstanceType.Commands)

    this.config = new ConfigManager(app, this.logger, app.getConfigFilePath('commands.json'), {
      enabled: true,
      disabledCommands: []
    })

    this.commands = [
      new Api(),
      new Asian(),
      new Bits(),
      new Bedwars(),
      new Boop(),
      new Calculate(),
      new Catacomb(),
      new CurrentDungeon(),
      new DadJoke(),
      new DarkAuction(),
      new DevelopmentExcuse(),
      new Election(),
      new EightBallCommand(),
      new Execute(),
      new Explain(),
      new Fetchur(),
      new Guild(),
      new Help(),
      new HeartOfTheMountain(),
      new Insult(),
      new Iq(),
      new Kuudra(),
      new Level(),
      new List(),
      new MagicalPower(),
      new Mayor(),
      new Mute(),
      new Networth(),
      ...new PartyManager().resolveCommands(),
      new PersonalBest(),
      new Points30days(),
      new PointsAll(),
      new Purse(),
      new Reputation(),
      new Rng(),
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
      new Timecharms(),
      new Toggle(),
      new Toggled(),
      new Unlink(),
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
            `Trigger already defined in ${alreadyDefinedCommandName} when trying to add it to ${command.triggers[0]}`
          )
        } else {
          allTriggers.set(trigger, command.triggers[0])
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
    if (event.instanceType === InstanceType.Discord) {
      this.application.emit('command', {
        eventId: this.eventHelper.generate(),
        instanceName: event.instanceName,
        instanceType: event.instanceType,

        channelType: event.channelType,
        originEventId: event.eventId,
        userId: event.userId,
        username: event.username,

        commandName: commandName,
        commandResponse: response
      })
    } else {
      this.application.emit('command', {
        eventId: this.eventHelper.generate(),
        instanceName: event.instanceName,
        instanceType: event.instanceType,

        channelType: event.channelType,
        originEventId: event.eventId,

        uuid: event.uuid,
        username: event.username,

        commandName: commandName,
        commandResponse: response
      })
    }
  }

  private feedback(event: ChatEvent, commandName: string, response: string): void {
    if (event.instanceType === InstanceType.Discord) {
      this.application.emit('commandFeedback', {
        eventId: this.eventHelper.generate(),
        instanceName: event.instanceName,
        instanceType: event.instanceType,

        channelType: event.channelType,
        originEventId: event.eventId,
        userId: event.userId,
        username: event.username,

        commandName: commandName,
        commandResponse: response
      })
    } else {
      this.application.emit('commandFeedback', {
        eventId: this.eventHelper.generate(),
        instanceName: event.instanceName,
        instanceType: event.instanceType,

        channelType: event.channelType,
        originEventId: event.eventId,

        uuid: event.uuid,
        username: event.username,

        commandName: commandName,
        commandResponse: response
      })
    }
  }
}

export interface CommandsConfig {
  enabled: boolean
  disabledCommands: string[]
}
