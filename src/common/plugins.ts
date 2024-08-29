import type { Logger } from 'log4js'

import type Application from '../application.js'
// TODO: fix by either creating special rule in linting or by removing this functionality to meet the standard
// eslint-disable-next-line import/no-restricted-paths
import type { ChatCommandHandler } from '../instance/commands/common/command-interface.js'
// eslint-disable-next-line import/no-restricted-paths
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
