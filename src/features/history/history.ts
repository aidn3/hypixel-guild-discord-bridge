import type Application from '../../application.js'
import { ContentType } from '../../common/application-event.js'
import type { CommandOrigin, DiscordCommandContext } from '../../common/commands.js'
import { Instance } from '../../common/instance.js'

import { DiscordHistoryCommand, discordHistoryCommandHandler } from './commands/discord-history.js'
import { HistoryDatabase, HistoryType } from './history-database.js'

export class History extends Instance {
  public readonly database: HistoryDatabase

  constructor(application: Application) {
    super(application, 'history')

    this.database = new HistoryDatabase(
      this.application.core.getSqliteManager(),
      this.application.core.users,
      this.logger
    )

    this.application.registerDiscordCommand({
      ...DiscordHistoryCommand,
      handler: (context: Readonly<DiscordCommandContext<CommandOrigin.Private>>) =>
        discordHistoryCommandHandler(context, this.database)
    })

    this.application.on('chat', (event) => {
      this.database.addChat({
        userId: this.application.core.users.resolveUserId(event.user.getUserIdentifier()),
        platform: event.platform,
        createdAt: event.createdAt,
        channelType: event.channelType,
        historyType: HistoryType.Chat,
        message: event.message
      })
    })

    this.application.on('command', (event) => {
      this.database.addCommandResponse({
        userId: this.application.core.users.resolveUserId(event.user.getUserIdentifier()),
        platform: event.platform,
        createdAt: event.createdAt,
        channelType: event.channelType,
        historyType: HistoryType.CommandResponse,
        message:
          event.commandResponse.type === ContentType.ImageBased
            ? (event.commandResponse.extra ?? event.commandResponse.unsupported)
            : event.commandResponse.content
      })
    })

    this.application.on('commandFeedback', (event) => {
      this.database.addCommandFeedback({
        userId: this.application.core.users.resolveUserId(event.user.getUserIdentifier()),
        platform: event.platform,
        createdAt: event.createdAt,
        channelType: event.channelType,
        historyType: HistoryType.CommandFeedback,
        message:
          event.commandResponse.type === ContentType.ImageBased
            ? (event.commandResponse.extra ?? event.commandResponse.unsupported)
            : event.commandResponse.content
      })
    })

    this.application.on('guildPlayer', (event) => {
      this.database.addGuildPlayerActivity({
        userId: event.user ? this.application.core.users.resolveUserId(event.user.getUserIdentifier()) : undefined,
        createdAt: event.createdAt,
        responsibleUserId:
          'responsible' in event
            ? this.application.core.users.resolveUserId(event.responsible.getUserIdentifier())
            : undefined,
        type: event.type,
        historyType: HistoryType.GuildPlayerActivity,
        message: event.message
      })
    })

    this.application.on('guildGeneral', (event) => {
      this.database.addGuildGeneralActivity({
        type: event.type,
        createdAt: event.createdAt,
        historyType: HistoryType.GuildGeneralActivity,
        message: event.message
      })
    })
  }
}
