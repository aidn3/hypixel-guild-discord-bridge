import type { CommandsConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type { ChatEvent } from '../../common/application-event.js'
import { ChannelType, InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'

import type { ChatCommandHandler } from './common/command-interface.js'
import EightBallCommand from './triggers/8ball.js'
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
import Networth from './triggers/networth.js'
import Override from './triggers/override.js'
import PersonalBest from './triggers/personal-best.js'
import RockPaperScissors from './triggers/rock-paper-scissors.js'
import Roulette from './triggers/roulette.js'
import RunsToClassAverage from './triggers/runs-to-class-average.js'
import Runs from './triggers/runs.js'
import Secrets from './triggers/secrets.js'
import Skills from './triggers/skills.js'
import Slayer from './triggers/slayer.js'
import Soopy from './triggers/soopy.js'
import Toggle from './triggers/toggle.js'
import Weight from './triggers/weight.js'

export class CommandsInstance extends ClientInstance<CommandsConfig> {
  public readonly commands: ChatCommandHandler[]

  constructor(app: Application, instanceName: string, config: CommandsConfig) {
    super(app, instanceName, InstanceType.Commands, config)

    this.commands = [
      new EightBallCommand(),
      new Calculate(),
      new Catacomb(),
      new RunsToClassAverage(),
      new DarkAuction(),
      new Explain(),
      new Guild(),
      new Help(),
      new Iq(),
      new Kuudra(),
      new Level(),
      new Networth(),
      new Override(),
      new PersonalBest(),
      new RockPaperScissors(),
      new Roulette(),
      new Runs(),
      new Secrets(),
      new Skills(),
      new Slayer(),
      new Soopy(),
      new Toggle(),
      new Weight(),
      new Bits()
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

  connect(): void {
    this.checkCommandsIntegrity()
    this.setAndBroadcastNewStatus(Status.Connected, 'chat commands are ready to serve')
  }

  async handle(event: ChatEvent): Promise<void> {
    if (!event.message.startsWith(this.config.commandPrefix)) return

    const isAdmin = event.username === this.config.adminUsername && event.instanceType === InstanceType.Minecraft
    const commandName = event.message.slice(this.config.commandPrefix.length).split(' ')[0].toLowerCase()
    const commandsArguments = event.message.split(' ').slice(1)

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) return

    // officer chat and application owner can bypass enabled flag
    if (!command.enabled && !isAdmin && event.channelType !== ChannelType.Officer) {
      return
    }

    try {
      const commandResponse = await command.handler({
        app: this.app,

        logger: this.logger,
        allCommands: this.commands,
        commandPrefix: this.config.commandPrefix,
        adminUsername: this.config.adminUsername,

        instanceName: event.instanceName,
        instanceType: event.instanceType,
        channelType: event.channelType,

        username: event.username,
        isAdmin: isAdmin,
        args: commandsArguments,

        sendFeedback: (feedbackResponse) => {
          this.feedback(event, command.triggers[0], feedbackResponse)
        }
      })

      this.reply(event, command.triggers[0], commandResponse)
    } catch (error) {
      this.logger.error('Error while handling command', error)
      this.reply(event, command.triggers[0], `${event.username}, error trying to execute ${command.triggers[0]}.`)
    }
  }

  private reply(event: ChatEvent, commandName: string, response: string): void {
    this.app.emit('command', {
      localEvent: true,
      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,
      discordChannelId: event.channelId,
      username: event.username,
      fullCommand: event.message,
      commandName: commandName,
      commandResponse: response,
      alreadyReplied: false
    })
  }

  private feedback(event: ChatEvent, commandName: string, response: string): void {
    this.app.emit('commandFeedback', {
      localEvent: true,
      instanceName: event.instanceName,
      instanceType: event.instanceType,
      channelType: event.channelType,
      discordChannelId: event.channelId,
      username: event.username,
      fullCommand: event.message,
      commandName: commandName,
      commandResponse: response,
      alreadyReplied: false
    })
  }
}
