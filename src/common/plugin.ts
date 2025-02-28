import type { Logger } from 'log4js'

import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import type EventHelper from '../util/event-helper.js'

import type { InstanceType } from './application-event.js'
import type { ChatCommandHandler, DiscordCommandHandler } from './commands.js'

export interface PluginInterface {
  onRun: (context: Readonly<PluginContext>) => void
}

export interface PluginContext {
  logger: Logger
  pluginName: string
  eventHelper: EventHelper<InstanceType.Plugin>
  application: Application

  addChatCommand?: (command: ChatCommandHandler) => void
  addDiscordCommand?: (command: DiscordCommandHandler) => void
}
