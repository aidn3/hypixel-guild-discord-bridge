import StringComparison from 'string-comparison'

import type Application from '../../application.js'
import type { ChatEvent, CommandLike, CommandSuggestion, Content } from '../../common/application-event.js'
import { ContentType, InstanceType, Permission } from '../../common/application-event.js'
import type { ChatCommandHandler } from '../../common/commands.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'

import Command67 from './triggers/67'
import EightBallCommand from './triggers/8ball.js'
import Age from './triggers/age.js'
import Api from './triggers/api.js'
import Armor from './triggers/armor'
import Asian from './triggers/asian.js'
import Bedwars from './triggers/bedwars.js'
import Bestiary from './triggers/bestiary'
import Bits from './triggers/bits.js'
import Boo from './triggers/boo.js'
import Boop from './triggers/boop.js'
import Bowspleef from './triggers/bowspleef.js'
import Buildbattle from './triggers/buildbattle'
import Calculate from './triggers/calculate.js'
import Catacombs from './triggers/catacombs'
import Chocolate from './triggers/chocolate'
import Collection from './triggers/collection'
import CopsAndCrims from './triggers/cops-and-crims.js'
import CountingChain from './triggers/counting-chain'
import CurrentDungeon from './triggers/current-dungeon.js'
import DadJoke from './triggers/dadjoke.js'
import DarkAuction from './triggers/darkauction.js'
import DevelopmentExcuse from './triggers/devexcuse.js'
import Discord from './triggers/discord'
import Dojo from './triggers/dojo'
import Eggs from './triggers/eggs'
import Election from './triggers/election.js'
import Equipments from './triggers/equipments'
import Essence from './triggers/essence'
import Execute from './triggers/execute.js'
import Explain from './triggers/explain.js'
import Fairysouls from './triggers/fairysouls'
import Fetchur from './triggers/fetchur.js'
import Forge from './triggers/forge'
import Garden from './triggers/garden'
import Gifted from './triggers/gifted.js'
import GuildCheck from './triggers/guild-check'
import Guild from './triggers/guild.js'
import Help from './triggers/help.js'
import HeartOfTheForest from './triggers/hotf.js'
import HeartOfTheMountain from './triggers/hotm.js'
import HypixelLevel from './triggers/hypixel-level'
import Insult from './triggers/insult.js'
import Inventory from './triggers/inventory'
import Iq from './triggers/iq.js'
import Item from './triggers/item'
import Jacob from './triggers/jacob'
import Karma from './triggers/karma.js'
import Kuudra from './triggers/kuudra.js'
import Level from './triggers/level.js'
import List from './triggers/list.js'
import MagicalPower from './triggers/magicalpower.js'
import Mayor from './triggers/mayor.js'
import Megawalls from './triggers/megawalls'
import Mineshafts from './triggers/mineshafts.js'
import Motes from './triggers/motes.js'
import Mute from './triggers/mute.js'
import Networth from './triggers/networth.js'
import News from './triggers/news.js'
import PartyManager from './triggers/party.js'
import PersonalBest from './triggers/personal-best.js'
import Placeholder from './triggers/placeholder'
import Points30days from './triggers/points-30days'
import PointsAll from './triggers/points-all'
import Praise from './triggers/praise'
import Purse from './triggers/purse.js'
import Rank from './triggers/rank.js'
import Reputation from './triggers/reputation.js'
import Rng from './triggers/rng.js'
import RockPaperScissors from './triggers/rock-paper-scissors.js'
import Roulette from './triggers/roulette.js'
import RunsToClassAverage from './triggers/runs-to-class-average.js'
import Runs from './triggers/runs.js'
import Sacks from './triggers/sacks'
import Secrets from './triggers/secrets.js'
import Select from './triggers/select'
import Skills from './triggers/skills.js'
import Skywars from './triggers/skywars'
import Slayer from './triggers/slayer.js'
import Soopy from './triggers/soopy.js'
import SpecialMayors from './triggers/special-mayors'
import Starfall from './triggers/starfall.js'
import StatusCommand from './triggers/status.js'
import Timecharms from './triggers/timecharms.js'
import Toggle from './triggers/toggle.js'
import Toggled from './triggers/toggled.js'
import Trivia from './triggers/trivia'
import TrophyFish from './triggers/trophy-fish'
import Uhc from './triggers/uhc'
import Unlink from './triggers/unlink.js'
import Unscramble from './triggers/unscramble'
import Uuid from './triggers/uuid'
import Vengeance from './triggers/vengeance.js'
import Warp from './triggers/warp.js'
import Weight from './triggers/weight.js'
import Woolwars from './triggers/woolwars'

export class CommandsInstance extends Instance<InstanceType.Commands> {
  private readonly commands: ChatCommandHandler[] = []

  constructor(app: Application) {
    super(app, InternalInstancePrefix + InstanceType.Commands, InstanceType.Commands)

    const commandsToAdd = [
      new Age(),
      new Api(),
      new Armor(),
      new Asian(),
      new Bits(),
      new News(),
      new Bedwars(),
      new Bestiary(),
      new Boo(),
      new Boop(),
      new Buildbattle(),
      new Bowspleef(),
      new Calculate(),
      new Catacombs(),
      new Chocolate(),
      new Collection(),
      new CopsAndCrims(),
      new Command67(),
      new CountingChain(),
      new CurrentDungeon(),
      new DadJoke(),
      new DarkAuction(),
      new DevelopmentExcuse(),
      new Discord(),
      new Dojo(),
      new Eggs(),
      new Election(),
      new Equipments(),
      new EightBallCommand(),
      new Essence(),
      new Execute(),
      new Explain(),
      new Fairysouls(),
      new Fetchur(),
      new Forge(),
      new Garden(),
      new Gifted(),
      new Guild(),
      new GuildCheck(),
      new Help(),
      new HeartOfTheForest(),
      new HeartOfTheMountain(),
      new HypixelLevel(),
      new Insult(),
      new Inventory(),
      new Iq(),
      new Item(),
      new Jacob(),
      new Karma(),
      new Kuudra(),
      new Level(),
      new List(),
      new MagicalPower(),
      new Mayor(),
      new Megawalls(),
      new Mineshafts(),
      new Motes(),
      new Mute(),
      new Networth(),
      ...new PartyManager().resolveCommands(),
      new PersonalBest(),
      new Placeholder(),
      new Points30days(),
      new PointsAll(),
      new Praise(),
      new Purse(),
      new Rank(),
      new Reputation(),
      new Rng(),
      new RockPaperScissors(),
      new Roulette(),
      new Runs(),
      new RunsToClassAverage(),
      new Sacks(),
      new Secrets(),
      new Select(),
      new Skills(),
      new Skywars(),
      new Slayer(),
      new Soopy(),
      new SpecialMayors(),
      new Starfall(),
      new StatusCommand(),
      new Timecharms(),
      new Toggle(),
      new Toggled(),
      new Trivia(),
      new TrophyFish(),
      new Uhc(),
      new Unlink(),
      new Unscramble(),
      new Uuid(),
      new Vengeance(),
      new Warp(),
      new Weight(),
      new Woolwars()
    ]

    for (const commandToAdd of commandsToAdd) {
      this.addCommand(commandToAdd)
    }

    this.application.on('chat', async (event) => {
      await this.handle(event).catch(this.errorHandler.promiseCatch('handling chat event'))
    })
  }

  public addCommand(commandToAdd: ChatCommandHandler): void {
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

    for (const trigger of commandToAdd.triggers) {
      if (allTriggers.has(trigger)) {
        const alreadyDefinedCommandName = allTriggers.get(trigger)
        throw new Error(
          `Trigger already defined in ${alreadyDefinedCommandName} when trying to add it to ${commandToAdd.triggers[0]}`
        )
      }
    }

    this.commands.push(commandToAdd)
  }

  async handle(event: ChatEvent): Promise<void> {
    const config = this.application.core.commandsConfigurations
    if (!config.getCommandsEnabled()) return

    const chatPrefix = config.getChatPrefix()
    if (!event.message.startsWith(chatPrefix)) return

    const commandName = event.message.slice(chatPrefix.length).split(' ')[0].toLowerCase()
    const commandsArguments = event.message.split(' ').slice(1)

    if (commandName.length === 0) {
      return
    }

    const command = this.commands.find((c) => c.triggers.includes(commandName))
    if (command == undefined) {
      await this.trySuggest(event, commandName)
      return
    }

    // Disabled commands can only be used by officers and admins, regular users cannot use them
    const commandDisabled = config.getDisabledCommands().includes(command.triggers[0].toLowerCase())
    const userPermission = event.user.permission()
    if (
      commandDisabled &&
      (userPermission === Permission.Anyone || (userPermission === Permission.Helper && !config.getAllowHelperToggle()))
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
        commandPrefix: chatPrefix,

        message: event,
        username: event.user.mojangProfile()?.name ?? event.user.displayName(),
        args: commandsArguments,

        sendFeedback: async (feedbackResponse) => {
          await this.feedback(event, command.triggers[0], this.formatContent(feedbackResponse))
        }
      })

      await this.reply(event, command.triggers[0], this.formatContent(commandResponse))
    } catch (error) {
      this.logger.error('Error while handling command', error)
      await this.reply(
        event,
        command.triggers[0],
        this.formatContent(
          `${event.user.displayName()}, an error occurred while trying to execute ${command.triggers[0]}.`
        )
      )
    }
  }

  private formatContent(value: string | Content): Content {
    return typeof value === 'string' ? { type: ContentType.TextBased, content: value, extra: undefined } : value
  }

  private async reply(event: ChatEvent, commandName: string, response: Content): Promise<void> {
    await this.application.emit('command', this.format(event, commandName, response))
  }

  private async feedback(event: ChatEvent, commandName: string, response: Content): Promise<void> {
    await this.application.emit('commandFeedback', this.format(event, commandName, response))
  }

  private format(event: ChatEvent, commandName: string, response: Content): CommandLike {
    switch (event.instanceType) {
      case InstanceType.Discord: {
        return {
          eventId: this.eventHelper.generate(),
          createdAt: Date.now(),

          instanceName: event.instanceName,
          instanceType: event.instanceType,

          channelType: event.channelType,
          originEventId: event.eventId,
          user: event.user,

          commandName: commandName,
          commandResponse: response
        }
      }

      case InstanceType.Minecraft: {
        return {
          eventId: this.eventHelper.generate(),
          createdAt: Date.now(),

          instanceName: event.instanceName,
          instanceType: event.instanceType,

          channelType: event.channelType,
          originEventId: event.eventId,
          user: event.user,

          commandName: commandName,
          commandResponse: response
        }
      }

      default: {
        return {
          eventId: this.eventHelper.generate(),
          createdAt: Date.now(),

          instanceName: event.instanceName,
          instanceType: event.instanceType,

          channelType: event.channelType,
          originEventId: event.eventId,
          user: event.user,

          commandName: commandName,
          commandResponse: response
        }
      }
    }
  }

  private async trySuggest(event: ChatEvent, query: string): Promise<void> {
    const config = this.application.core.commandsConfigurations
    if (!config.getSuggestionsEnabled()) return

    const prefix = config.getChatPrefix()
    query = query.toLowerCase()
    let result: { trigger: string; command: ChatCommandHandler; similarity: number } | undefined = undefined

    for (const command of this.commands) {
      for (const trigger of command.triggers) {
        const similarity = StringComparison.levenshtein.similarity(query, trigger)
        if (result !== undefined && result.similarity > similarity) continue

        result = { trigger, command, similarity }
      }
    }

    if (result === undefined) return

    const username = event.user.displayName()
    const suggestion: CommandSuggestion = {
      ...this.eventHelper.fillBaseEvent(),
      originEventId: event.eventId,

      user: event.user,
      channelType: event.channelType,

      query: query,
      response: `${username}, did you mean: ${prefix}${result.trigger} - ${result.command.getExample(prefix).replaceAll('%s', username)} - Help: ${result.command.description}`
    }

    await this.application.emit('commandSuggestion', suggestion)
  }
}
