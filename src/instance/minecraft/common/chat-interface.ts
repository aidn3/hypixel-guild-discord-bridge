import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type MinecraftInstance from '../minecraft-instance.js'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void | Promise<void>
}

export interface MinecraftChatContext {
  application: Application

  clientInstance: MinecraftInstance
  instanceName: string

  logger: Logger
  errorHandler: UnexpectedErrorHandler

  message: string
}
