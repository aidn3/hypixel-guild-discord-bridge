import type Application from '../../application'
import type { CommandOrigin, DiscordCommandContext, OptionMinecraftInstance } from '../../common/commands'
import { Instance } from '../../common/instance'

import { ChatCounter } from './chat-counter'
import Airstrike from './commands/airstrike'
import Current from './commands/current'
import Daily from './commands/daily'
import { discordEconomyCommandHandler, DiscordGuildCommand } from './commands/discord-economy'
import Diss from './commands/diss'
import Give from './commands/give'
import Glaze from './commands/glaze'
import Mute from './commands/mute'
import { Nuke } from './commands/nuke'
import Roulette from './commands/roulette'
import Sacrifice from './commands/sacrifice'
import Take from './commands/take'
import { EconomyConfigurations } from './economy-configurations'
import { EconomyDatabase } from './economy-database'

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
      this.logger
    )

    this.application.registerChatCommand(new Current(this.database))
    this.application.registerChatCommand(new Give(this.database, this.configuration))
    this.application.registerChatCommand(new Take(this.database, this.configuration))
    this.application.registerChatCommand(new Airstrike(this.database))
    this.application.registerChatCommand(new Daily(this.database, this.configuration))
    this.application.registerChatCommand(new Sacrifice(this.database, this.configuration))
    this.application.registerChatCommand(new Glaze(this.database, this.configuration))
    this.application.registerChatCommand(new Mute(this.database))
    this.application.registerChatCommand(new Diss(this.database, this.configuration))
    this.application.registerChatCommand(new Roulette(this.database))
    this.application.registerChatCommand(new Nuke(this.database))
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
