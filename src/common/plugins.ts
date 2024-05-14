import type { Logger } from 'log4js'

import type Application from '../application.js'
import type { ChatCommandHandler } from '../instance/commands/common/command-interface.js'
import type { CommandInterface } from '../instance/discord/common/command-interface.js'

import type { ClientInstance } from './client-instance.js'

export interface PluginInterface {
  onRun: (context: PluginContext) => void
}

export interface PluginContext {
  logger: Logger
  pluginName: string
  application: Application
  localInstances: ClientInstance<unknown>[]

  addChatCommand?: (command: ChatCommandHandler) => void
  addDiscordCommand?: (command: CommandInterface) => void
}
