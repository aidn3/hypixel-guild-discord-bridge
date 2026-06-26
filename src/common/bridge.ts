import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../application.js'

import type {
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  CommandSuggestion,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatus,
  MinecraftReactiveEvent
} from './application-event.js'
import type { Instance } from './instance.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

/**
 * Abstract class with abstract callback functions that must be implemented
 * to integrate bridge to other services. Use this class as a base when connecting two services.
 */
export default abstract class Bridge<K extends Instance> {
  protected readonly queue: PromiseQueue = new PromiseQueue(1)

  protected constructor(
    protected readonly application: Application,
    protected readonly clientInstance: K,
    protected readonly logger: Logger,
    protected readonly errorHandler: UnexpectedErrorHandler,
    protected readonly abortSignal: AbortSignal
  ) {
    this.application = application
    this.clientInstance = clientInstance
    this.logger = logger
    this.errorHandler = errorHandler

    this.application.on(
      'command',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onCommand(event)))
          .catch(this.errorHandler.promiseCatch('handling command event'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'commandFeedback',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onCommandFeedback(event)))
          .catch(this.errorHandler.promiseCatch('handling command feedback'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'commandSuggestion',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onCommandSuggestion(event)))
          .catch(this.errorHandler.promiseCatch('handling command suggestion'))
      },
      { signal: this.abortSignal }
    )

    this.application.on(
      'chat',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onChat(event)))
          .catch(this.errorHandler.promiseCatch('handling chat event'))
      },
      { signal: this.abortSignal }
    )

    this.application.on(
      'guildPlayer',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onGuildPlayer(event)))
          .catch(this.errorHandler.promiseCatch('handling guildPlayer event'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'guildGeneral',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onGuildGeneral(event)))
          .catch(this.errorHandler.promiseCatch('handling guildGeneral event'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'minecraftChatEvent',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onMinecraftChatEvent(event)))
          .catch(this.errorHandler.promiseCatch('handling minecraftChat event'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'instanceStatus',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onInstance(event)))
          .catch(this.errorHandler.promiseCatch('handling instance event'))
      },
      { signal: this.abortSignal }
    )
    this.application.on(
      'broadcast',
      async (event) => {
        await this.queue
          .add(() => Promise.resolve(this.onBroadcast(event)))
          .catch(this.errorHandler.promiseCatch('handling broadcast event'))
      },
      { signal: this.abortSignal }
    )
  }

  protected abstract onCommand(event: CommandEvent): void | Promise<void>

  protected abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  protected abstract onCommandSuggestion(event: CommandSuggestion): void | Promise<void>

  protected abstract onChat(event: ChatEvent): void | Promise<void>

  protected abstract onGuildPlayer(event: GuildPlayerEvent): void | Promise<void>

  protected abstract onGuildGeneral(event: GuildGeneralEvent): void | Promise<void>

  protected abstract onMinecraftChatEvent(event: MinecraftReactiveEvent): void | Promise<void>

  protected abstract onInstance(event: InstanceStatus): void | Promise<void>

  protected abstract onBroadcast(event: BroadcastEvent): void | Promise<void>
}
