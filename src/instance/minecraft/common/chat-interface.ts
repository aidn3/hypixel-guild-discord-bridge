import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type MinecraftInstance from '../minecraft-instance.js'

import type MessageAssociation from './message-association.js'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void | Promise<void>
}

export interface MinecraftChatContext {
  application: Application

  clientInstance: MinecraftInstance
  instanceName: string

  eventHelper: EventHelper<InstanceType.Minecraft>
  logger: Logger
  errorHandler: UnexpectedErrorHandler
  messageAssociation: MessageAssociation

  message: string
  rawMessage: string
  jsonMessage: unknown
}
