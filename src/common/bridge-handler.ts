import type { Logger } from 'log4js'

import type Application from '../application.js'

import type {
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatusEvent,
  MinecraftChatEvent
} from './application-event.js'
import type { ClientInstance } from './client-instance.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

/**
 * Abstract class with abstract callback functions that must be implemented
 * to integrate bridge to other services. Use this class as a base when connecting two services.
 */
export default abstract class BridgeHandler<K extends ClientInstance<unknown>> {
  protected readonly application: Application
  protected readonly clientInstance: K

  protected readonly logger: Logger
  protected readonly errorHandler: UnexpectedErrorHandler

  protected constructor(
    application: Application,
    clientInstance: K,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    this.application = application
    this.clientInstance = clientInstance
    this.logger = logger
    this.errorHandler = errorHandler

    this.application.on('command', (event) => {
      void Promise.resolve(this.onCommand(event)).catch(this.errorHandler.promiseCatch('handling command event'))
    })
    this.application.on('commandFeedback', (event) => {
      void Promise.resolve(this.onCommandFeedback(event)).catch(
        this.errorHandler.promiseCatch('handling command feedback')
      )
    })

    this.application.on('chat', (event) => {
      void Promise.resolve(this.onChat(event)).catch(this.errorHandler.promiseCatch('handling chat event'))
    })

    this.application.on('guildPlayer', (event) => {
      void Promise.resolve(this.onGuildPlayer(event)).catch(
        this.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
    this.application.on('guildGeneral', (event) => {
      void Promise.resolve(this.onGuildGeneral(event)).catch(
        this.errorHandler.promiseCatch('handling guildGeneral event')
      )
    })
    this.application.on('minecraftChatEvent', (event) => {
      void Promise.resolve(this.onMinecraftChatEvent(event)).catch(
        this.errorHandler.promiseCatch('handling minecraftChat event')
      )
    })
    this.application.on('instanceStatus', (event) => {
      void Promise.resolve(this.onInstance(event)).catch(this.errorHandler.promiseCatch('handling instance event'))
    })
    this.application.on('broadcast', (event) => {
      void Promise.resolve(this.onBroadcast(event)).catch(this.errorHandler.promiseCatch('handling broadcast event'))
    })
  }

  protected abstract onCommand(event: CommandEvent): void | Promise<void>

  protected abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  protected abstract onChat(event: ChatEvent): void | Promise<void>

  protected abstract onGuildPlayer(event: GuildPlayerEvent): void | Promise<void>

  protected abstract onGuildGeneral(event: GuildGeneralEvent): void | Promise<void>

  protected abstract onMinecraftChatEvent(event: MinecraftChatEvent): void | Promise<void>

  protected abstract onInstance(event: InstanceStatusEvent): void | Promise<void>

  protected abstract onBroadcast(event: BroadcastEvent): void | Promise<void>
}
