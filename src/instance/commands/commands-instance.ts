import assert from 'node:assert'

import StringComparison from 'string-comparison'

import type Application from '../../application.js'
import type { ChatEvent, CommandLike, CommandSuggestion, Content } from '../../common/application-event.js'
import { ChannelType, ContentType, Permission, Platform } from '../../common/application-event.js'
import type {
  ChatCommandContext,
  ChatCommandHandler,
  ChatCommandRequirements,
  CommandId
} from '../../common/commands.js'
import { ChatCommandGroup } from '../../common/commands.js'
import type { DisplayableInstance } from '../../common/instance.js'
import { Instance } from '../../common/instance.js'
import { HypixelApiFail, HypixelFailType } from '../../core/hypixel/hypixel-fetcher.js'
import { capitalize } from '../../utility/shared-utility.js'

import { CommandsConfigurations } from './commands-configurations.js'
import { CommandsCooldownHandler } from './commands-cooldown-handler.js'
import { CommandsCooldown } from './commands-cooldown.js'
import { CommandsDatabase } from './commands-database.js'
import { canOnlyUseIngame } from './common/utility.js'
import Command67 from './fun-and-games/67.js'
import EightBallCommand from './fun-and-games/8ball.js'
import Coinflip from './fun-and-games/coinflip.js'
import Dice from './fun-and-games/dice.js'
import Iq from './fun-and-games/iq.js'
import RockPaperScissors from './fun-and-games/rock-paper-scissors.js'
import Vengeance from './fun-and-games/vengeance.js'
import AccessoryPower from './triggers/accessorypower.js'
import Agatha from './triggers/agatha.js'
import Age from './triggers/age.js'
import Api from './triggers/api.js'
import Armor from './triggers/armor.js'
import Asian from './triggers/asian.js'
import Bedwars from './triggers/bedwars.js'
import Bestiary from './triggers/bestiary.js'
import Bingo from './triggers/bingo.js'
import Bits from './triggers/bits.js'
import Boo from './triggers/boo.js'
import Boop from './triggers/boop.js'
import Bowspleef from './triggers/bowspleef.js'
import Buildbattle from './triggers/buildbattle.js'
import Calculate from './triggers/calculate.js'
import Catacombs from './triggers/catacombs.js'
import Chocolate from './triggers/chocolate.js'
import ClassAverage from './triggers/classaverage.js'
import Collection from './triggers/collection.js'
import Contests from './triggers/contests.js'
import CopsAndCrims from './triggers/cops-and-crims.js'
import CountingChain from './triggers/counting-chain.js'
import CurrentDungeon from './triggers/current-dungeon.js'
import CurrentKuudra from './triggers/current-kuudra.js'
import DadJoke from './triggers/dadjoke.js'
import DarkAuction from './triggers/darkauction.js'
import DevelopmentExcuse from './triggers/devexcuse.js'
import Diana from './triggers/diana.js'
import Discord from './triggers/discord.js'
import Dojo from './triggers/dojo.js'
import Eggs from './triggers/eggs.js'
import Election from './triggers/election.js'
import Equipments from './triggers/equipments.js'
import Essence from './triggers/essence.js'
import Execute from './triggers/execute.js'
import Explain from './triggers/explain.js'
import Fairysouls from './triggers/fairysouls.js'
import Fetchur from './triggers/fetchur.js'
import Forge from './triggers/forge.js'
import Garden from './triggers/garden.js'
import Gexp from './triggers/gexp.js'
import Gifted from './triggers/gifted.js'
import GuildCheck from './triggers/guild-check.js'
import Guild from './triggers/guild.js'
import Help from './triggers/help.js'
import HeartOfTheForest from './triggers/hotf.js'
import HeartOfTheMountain from './triggers/hotm.js'
import HypixelLevel from './triggers/hypixel-level.js'
import Inventory from './triggers/inventory.js'
import Item from './triggers/item.js'
import Jacob from './triggers/jacob.js'
import Karma from './triggers/karma.js'
import Kuudra from './triggers/kuudra.js'
import Level from './triggers/level.js'
import List from './triggers/list.js'
import Mayor from './triggers/mayor.js'
import Megawalls from './triggers/megawalls.js'
import Mineshafts from './triggers/mineshafts.js'
import Motes from './triggers/motes.js'
import Networth from './triggers/networth.js'
import News from './triggers/news.js'
import OverflowSkills from './triggers/oskills.js'
import PartyManager from './triggers/party.js'
import PersonalBest from './triggers/personal-best.js'
import Placeholder from './triggers/placeholder.js'
import Points30days from './triggers/points-30days.js'
import PointsAll from './triggers/points-all.js'
import Purse from './triggers/purse.js'
import Rank from './triggers/rank.js'
import Reputation from './triggers/reputation.js'
import Rng from './triggers/rng.js'
import RunsTillCatacombs from './triggers/runs-till-catacombs.js'
import RunsToClassAverage from './triggers/runs-to-class-average.js'
import Runs from './triggers/runs.js'
import Sacks from './triggers/sacks.js'
import Secrets from './triggers/secrets.js'
import Select from './triggers/select.js'
import Skills from './triggers/skills.js'
import Skywars from './triggers/skywars.js'
import Slayer from './triggers/slayer.js'
import Soopy from './triggers/soopy.js'
import SpecialMayors from './triggers/special-mayors.js'
import Starfall from './triggers/starfall.js'
import StatusCommand from './triggers/status.js'
import Timecharms from './triggers/timecharms.js'
import Toggle from './triggers/toggle.js'
import Toggled from './triggers/toggled.js'
import Trivia from './triggers/trivia.js'
import TrophyFish from './triggers/trophy-fish.js'
import Uhc from './triggers/uhc.js'
import Unlink from './triggers/unlink.js'
import Unscramble from './triggers/unscramble.js'
import UrchinCommand from './triggers/urchin.js'
import Uuid from './triggers/uuid.js'
import Warp from './triggers/warp.js'
import Weight from './triggers/weight.js'
import Winstreak from './triggers/winstreak.js'
import Woolwars from './triggers/woolwars.js'

export class CommandsInstance extends Instance implements DisplayableInstance {
  public readonly commandsConfigurations: CommandsConfigurations
  public readonly commandsCooldown: CommandsCooldown
  public readonly database: CommandsDatabase

  private readonly commands = new Map<ChatCommandGroup, ChatCommandHandler[]>()
  private readonly cooldownHandler: CommandsCooldownHandler

  constructor(app: Application) {
    super(app, 'chat-commands')

    const core = this.application.core
    this.commandsConfigurations = new CommandsConfigurations(core.getConfigurationsManager())
    this.database = new CommandsDatabase(core.getSqliteManager())
    this.commandsCooldown = new CommandsCooldown(core.getSqliteManager(), core.users, this.database)
    this.cooldownHandler = new CommandsCooldownHandler(this.application.core.users, this.commandsCooldown)

    for (const group of Object.values(ChatCommandGroup)) {
      this.commands.set(group, [])
    }

    const commandsToAdd = [
      new AccessoryPower(),
      new Agatha(),
      new Age(),
      new Api(),
      new Armor(),
      new Asian(),
      new Bits(),
      new News(),
      new Bedwars(),
      new Bestiary(),
      new Bingo(),
      new Boo(),
      new Boop(),
      new Buildbattle(),
      new Bowspleef(),
      new Calculate(),
      new Catacombs(),
      new Chocolate(),
      new ClassAverage(),
      new Coinflip(),
      new Collection(),
      new Contests(),
      new CopsAndCrims(),
      new Command67(),
      new CountingChain(),
      new CurrentDungeon(),
      new CurrentKuudra(),
      new DadJoke(),
      new DarkAuction(),
      new DevelopmentExcuse(),
      new Diana(),
      new Dice(),
      new Discord(),
      new Dojo(),
      new Eggs(),
      new Election(),
      new Equipments(),
      new EightBallCommand(),
      new Essence(),
      new Execute(),
      new Fairysouls(),
      new Fetchur(),
      new Forge(),
      new Garden(),
      new Gexp(),
      new Gifted(),
      new Guild(),
      new GuildCheck(),
      new HeartOfTheForest(),
      new HeartOfTheMountain(),
      new HypixelLevel(),
      new Inventory(),
      new Iq(),
      new Item(),
      new Jacob(),
      new Karma(),
      new Kuudra(),
      new Level(),
      new List(),
      new Mayor(),
      new Megawalls(),
      new Mineshafts(),
      new Motes(),
      new Networth(),
      new OverflowSkills(),
      ...new PartyManager().resolveCommands(),
      new PersonalBest(),
      new Placeholder(),
      new Points30days(),
      new PointsAll(),
      new Purse(),
      new Rank(),
      new Reputation(),
      new Rng(),
      new RockPaperScissors(),
      new Runs(),
      new RunsTillCatacombs(),
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
      new Trivia(),
      new TrophyFish(),
      new Uhc(),
      new Unlink(),
      new Unscramble(),
      new UrchinCommand(),
      new Uuid(),
      new Vengeance(),
      new Warp(),
      new Weight(),
      new Winstreak(),
      new Woolwars()
    ]

    const globalCommands = [new Explain(), new Help(), new Toggle(), new Toggled()]

    for (const commandToAdd of commandsToAdd) {
      this.addCommand(commandToAdd)
    }

    for (const globalCommand of globalCommands) {
      this.addGlobalCommand(globalCommand)
    }

    this.application.on('chat', async (event) => {
      await this.handle(event).catch(this.errorHandler.promiseCatch('handling chat event'))
    })
  }

  public addCommand(commandToAdd: ChatCommandHandler): void {
    const list = this.commands.get(commandToAdd.type)
    assert.ok(list !== undefined, `unknown command type=${commandToAdd.type}`)

    CommandsInstance.assertTriggerUniqueness(list, commandToAdd)
    for (const commands of this.commands.values()) CommandsInstance.assertIdUniqueness(commands, commandToAdd)

    list.push(commandToAdd)
  }

  public addGlobalCommand(commandToAdd: ChatCommandHandler): void {
    const allGroups = this.commands.values().toArray()
    for (const group of allGroups) {
      CommandsInstance.assertIdUniqueness(group, commandToAdd)
      CommandsInstance.assertTriggerUniqueness(group, commandToAdd)
    }

    for (const group of allGroups) {
      group.push(commandToAdd)
    }
  }

  private static assertTriggerUniqueness(groupCommands: ChatCommandHandler[], commandToAdd: ChatCommandHandler): void {
    const allTriggers = new Map<string, string>()
    for (const command of groupCommands) {
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
  }

  private static assertIdUniqueness(registeredCommands: ChatCommandHandler[], commandToAdd: ChatCommandHandler): void {
    const mapped = new Map<CommandId, ChatCommandHandler>()

    for (const registeredCommand of registeredCommands) {
      const mappedCommand = mapped.get(registeredCommand.id)
      if (mappedCommand !== undefined) {
        assert.fail(
          `Found a conflict between chat commands with the id=${registeredCommand.id.toString()}.` +
            ` Command1=${registeredCommand.triggers.join('/')}, Command2=${mappedCommand.triggers.join('/')}`
        )
      }
      mapped.set(registeredCommand.id, registeredCommand)
    }

    const mappedCommand = mapped.get(commandToAdd.id)
    if (mappedCommand !== undefined) {
      assert.fail(
        `Can not register a new command. Command has a conflict between in id=${commandToAdd.id.toString()}.` +
          ` existing=${mappedCommand.triggers.join('/')}, new=${commandToAdd.triggers.join('/')}`
      )
    }
  }

  public displayName(): string {
    return 'Commands'
  }

  private parseAndFindCommand(message: string):
    | {
        commands: ChatCommandHandler[]
        prefix: string
        name: string
        command: ChatCommandHandler | undefined
        parameters: string[]
      }
    | undefined {
    for (const group of Object.values(ChatCommandGroup)) {
      const groupStatus = this.database.commandGroups(group)
      const prefix = groupStatus.prefix
      if (!message.startsWith(prefix)) continue

      const name = message.slice(prefix.length).split(' ', 1)[0].toLowerCase()
      const parameters = message.split(' ').slice(1)

      if (name.length === 0 || name.startsWith(prefix)) return undefined

      const commands = this.commands.get(group)
      assert.ok(commands !== undefined)

      const command = commands.find((c) => c.triggers.includes(name))
      return { commands, prefix, name, command, parameters }
    }

    return undefined
  }

  async handle(event: ChatEvent): Promise<void> {
    if (!this.commandsConfigurations.getCommandsEnabled()) return

    const commandData = this.parseAndFindCommand(event.message)
    if (commandData === undefined) return
    const { commands, prefix, name, command, parameters } = commandData

    if (command == undefined) {
      await this.trySuggest(event, commands, prefix, name)
      return
    } else if (!command.enabled(this.application)) {
      return
    }

    // Disabled commands can only be used by officers and admins, regular users cannot use them
    const commandEnabled = this.database.initAndGet(command.id).enabled
    const userPermission = await event.user.permission()
    if (
      !commandEnabled &&
      (userPermission === Permission.Anyone ||
        (userPermission === Permission.Helper && !this.commandsConfigurations.getAllowHelperToggle()))
    ) {
      return
    }

    try {
      const cooldownOptions = command.cooldownOptions()
      const context: ChatCommandContext = {
        app: this.application,

        t: this.application.i18n.t,
        eventHelper: this.eventHelper,
        logger: this.logger,
        errorHandler: this.errorHandler,

        allCommands: commands,
        commandPrefix: prefix,

        message: event,
        username: event.user.mojangProfile()?.name ?? event.user.displayName(),
        args: parameters,

        sendFeedback: async (feedbackResponse) => {
          await this.feedback(event, command.triggers[0], this.formatContent(feedbackResponse))
        },
        resetCooldown: () => {
          this.cooldownHandler.resetCooldown(command, cooldownOptions, event)
        }
      }

      const commandRequirements = command.requirements(context)
      if (typeof commandRequirements === 'string') {
        await this.reply(event, command.triggers[0], this.formatContent(commandRequirements))
        return
      }

      const requirementsDenied = await this.checkRequirements(command, commandRequirements, context)
      if (requirementsDenied !== undefined) {
        await this.reply(event, command.triggers[0], this.formatContent(requirementsDenied))
        return
      }

      const commandResponse = await this.cooldownHandler.handle(command, cooldownOptions, context)
      await this.reply(event, command.triggers[0], this.formatContent(commandResponse))
    } catch (error) {
      if (error instanceof HypixelApiFail) {
        switch (error.type) {
          case HypixelFailType.Authentication: {
            await this.reply(
              event,
              command.triggers[0],
              this.formatContent(`${event.user.displayName()}, invalid Hypixel API key. Ask admin for help.`)
            )
            return
          }
          case HypixelFailType.Throttle: {
            await this.reply(
              event,
              command.triggers[0],
              this.formatContent(
                this.formatContent(`${event.user.displayName()}, reached Hypixel ratelimit. Try again later.`)
              )
            )
            return
          }
        }
      }

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

  private async checkRequirements(
    command: ChatCommandHandler,
    requirements: ChatCommandRequirements,
    context: ChatCommandContext
  ): Promise<string | undefined> {
    if (requirements.permission !== undefined) {
      const userPermission = await context.message.user.permission()
      if (requirements.permission === Permission.BridgeAdmin && userPermission < Permission.BridgeAdmin) {
        return context.app.i18n.t(($) => $['commands.error.must-be-admin'], { username: context.username })
      } else if (userPermission < requirements.permission) {
        return `${context.username}, you do not have permission to execute this command.`
      }
    }

    if (requirements.platforms !== undefined) {
      const platform = context.message.platform
      if (
        requirements.platforms.length === 1 &&
        requirements.platforms[0] === Platform.Minecraft &&
        platform !== Platform.Minecraft
      ) {
        return canOnlyUseIngame(context)
      }
      if (
        requirements.platforms.length === 1 &&
        requirements.platforms[0] === Platform.Discord &&
        platform !== Platform.Discord
      ) {
        return `${context.username}, command can only be executed in a Discord chat!`
      }

      if (!(requirements.platforms as Platform[]).includes(platform)) {
        return `${context.username}, command ${context.commandPrefix}${command.triggers[0]} can only be executed in these places: ${requirements.platforms.map((name) => capitalize(name)).join(', ')}`
      }
    }

    if (requirements.sources !== undefined) {
      const channelType = context.message.channelType
      if (
        requirements.sources.length === 1 &&
        requirements.sources[0] === ChannelType.Public &&
        channelType !== ChannelType.Public
      ) {
        return `${context.username}, command can only be executed in public chat!`
      }
      if (
        requirements.sources.length === 1 &&
        requirements.sources[0] === ChannelType.Officer &&
        channelType !== ChannelType.Officer
      ) {
        return `${context.username}, command can only be executed in officer chat!`
      }
      if (
        requirements.sources.length === 1 &&
        requirements.sources[0] === ChannelType.Private &&
        channelType !== ChannelType.Private
      ) {
        return `${context.username}, command can only be executed in private chat!`
      }

      if (!requirements.sources.includes(channelType)) {
        return `${context.username}, command ${context.commandPrefix}${command.triggers[0]} can only be executed in these channels: ${requirements.sources.map((name) => capitalize(name)).join(', ')}`
      }
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
    switch (event.platform) {
      case Platform.Discord: {
        return {
          eventId: this.eventHelper.generate(),
          createdAt: Date.now(),

          instance: event.instance,
          platform: event.platform,

          channelType: event.channelType,
          originEventId: event.eventId,
          user: event.user,

          commandName: commandName,
          commandResponse: response
        }
      }

      case Platform.Minecraft: {
        return {
          eventId: this.eventHelper.generate(),
          createdAt: Date.now(),

          instance: event.instance,
          platform: event.platform,

          channelType: event.channelType,
          originEventId: event.eventId,
          user: event.user,

          commandName: commandName,
          commandResponse: response
        }
      }

      default: {
        event satisfies never
        assert.fail(`not sure how to respond to this event: ${JSON.stringify(event)}`)
      }
    }
  }

  private async trySuggest(
    event: ChatEvent,
    commands: ChatCommandHandler[],
    prefix: string,
    query: string
  ): Promise<void> {
    if (!this.commandsConfigurations.getSuggestionsEnabled()) return

    query = query.toLowerCase()
    let result: { trigger: string; command: ChatCommandHandler; similarity: number } | undefined = undefined

    for (const command of commands) {
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
