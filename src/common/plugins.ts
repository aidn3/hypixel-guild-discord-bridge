import type { Logger } from 'log4js'

import type Application from '../application'
import type { ChatCommandHandler } from '../instance/commands/common/command-interface'
import type { CommandInterface } from '../instance/discord/common/command-interface'

import type { ClientInstance } from './client-instance'

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
