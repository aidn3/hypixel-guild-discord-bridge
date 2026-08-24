import type Application from '../../application.js'
import type { CommandOrigin, DiscordCommandContext, OptionMinecraftInstance } from '../../common/commands.js'
import { Instance } from '../../common/instance.js'

import { ChatCounter } from './chat-counter.js'
import Airstrike from './commands/airstrike.js'
import Current from './commands/current.js'
import Daily from './commands/daily.js'
import { discordEconomyCommandHandler, DiscordGuildCommand } from './commands/discord-economy.js'
import Diss from './commands/diss.js'
import Give from './commands/give.js'
import Glaze from './commands/glaze.js'
import Leaderboard from './commands/leaderboard.js'
import Mute from './commands/mute.js'
import { Nuke } from './commands/nuke.js'
import Rob from './commands/rob.js'
import Roulette from './commands/roulette.js'
import Sacrifice from './commands/sacrifice.js'
import Set from './commands/set.js'
import Take from './commands/take.js'
import { EconomyConfigurations } from './economy-configurations.js'
import { EconomyDatabase } from './economy-database.js'

export class Economy extends Instance {
  public readonly database: EconomyDatabase
  public readonly configuration: EconomyConfigurations

  private readonly chatCounter: ChatCounter

  constructor(application: Application) {
    super(application, 'Economy')

    this.configuration = new EconomyConfigurations(this.application.core.getConfigurationsManager())
    this.database = new EconomyDatabase(
      this.application.core.getSqliteManager(),
      this.application.core.users,
      this.application.core.verification,
      this.logger
    )

    this.application.registerChatCommand(new Current(this.database))
    this.application.registerChatCommand(new Give(this.database, this.configuration))
    this.application.registerChatCommand(new Take(this.database, this.configuration))
    this.application.registerChatCommand(new Set(this.database, this.configuration))
    this.application.registerChatCommand(new Airstrike(this.database))
    this.application.registerChatCommand(new Daily(this.database, this.configuration))
    this.application.registerChatCommand(new Sacrifice(this.database, this.configuration))
    this.application.registerChatCommand(new Glaze(this.database, this.configuration))
    this.application.registerChatCommand(new Mute(this.database))
    this.application.registerChatCommand(new Diss(this.database, this.configuration))
    this.application.registerChatCommand(new Roulette(this.database))
    this.application.registerChatCommand(new Nuke(this.database))
    this.application.registerChatCommand(new Leaderboard(this.database))
    this.application.registerChatCommand(new Rob(this.database))
    this.application.registerDiscordCommand({
      ...DiscordGuildCommand,
      handler: (context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>) =>
        discordEconomyCommandHandler(context, this.database)
    })

    this.chatCounter = new ChatCounter(
      this.application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.abortController.signal,
      this.database
    )
  }
}
