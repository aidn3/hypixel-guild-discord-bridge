import type { Logger } from 'log4js'

import type Application from '../application.js'

import type { ClientInstance } from './client-instance.js'
import type { ChatCommandHandler, DiscordCommandHandler } from './commands.js'

export interface PluginInterface {
  onRun: (context: Readonly<PluginContext>) => void
}

export interface PluginContext {
  logger: Logger
  pluginName: string
  application: Application

  addChatCommand?: (command: ChatCommandHandler) => void
  addDiscordCommand?: (command: DiscordCommandHandler) => void
}
