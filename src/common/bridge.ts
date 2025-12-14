import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../application.js'

import type {
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatus,
  InstanceType,
  MinecraftReactiveEvent
} from './application-event.js'
import type { Instance } from './instance.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

/**
 * Abstract class with abstract callback functions that must be implemented
 * to integrate bridge to other services. Use this class as a base when connecting two services.
 */
export default abstract class Bridge<K extends Instance<InstanceType>> {
  protected readonly application: Application
  protected readonly clientInstance: K

  protected readonly logger: Logger
  protected readonly errorHandler: UnexpectedErrorHandler
  protected readonly queue: PromiseQueue = new PromiseQueue(1)

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
      void this.queue
        .add(() => Promise.resolve(this.onCommand(event)))
        .catch(this.errorHandler.promiseCatch('handling command event'))
    })
    this.application.on('commandFeedback', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onCommandFeedback(event)))
        .catch(this.errorHandler.promiseCatch('handling command feedback'))
    })

    this.application.on('chat', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onChat(event)))
        .catch(this.errorHandler.promiseCatch('handling chat event'))
    })

    this.application.on('guildPlayer', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onGuildPlayer(event)))
        .catch(this.errorHandler.promiseCatch('handling guildPlayer event'))
    })
    this.application.on('guildGeneral', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onGuildGeneral(event)))
        .catch(this.errorHandler.promiseCatch('handling guildGeneral event'))
    })
    this.application.on('minecraftChatEvent', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onMinecraftChatEvent(event)))
        .catch(this.errorHandler.promiseCatch('handling minecraftChat event'))
    })
    this.application.on('instanceStatus', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onInstance(event)))
        .catch(this.errorHandler.promiseCatch('handling instance event'))
    })
    this.application.on('broadcast', (event) => {
      void this.queue
        .add(() => Promise.resolve(this.onBroadcast(event)))
        .catch(this.errorHandler.promiseCatch('handling broadcast event'))
    })
  }

  protected abstract onCommand(event: CommandEvent): void | Promise<void>

  protected abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  protected abstract onChat(event: ChatEvent): void | Promise<void>

  protected abstract onGuildPlayer(event: GuildPlayerEvent): void | Promise<void>

  protected abstract onGuildGeneral(event: GuildGeneralEvent): void | Promise<void>

  protected abstract onMinecraftChatEvent(event: MinecraftReactiveEvent): void | Promise<void>

  protected abstract onInstance(event: InstanceStatus): void | Promise<void>

  protected abstract onBroadcast(event: BroadcastEvent): void | Promise<void>
}
