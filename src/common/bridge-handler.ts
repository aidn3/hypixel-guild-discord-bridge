import type Application from '../application.js'

import type {
  ChatEvent,
  GuildPlayerEvent,
  CommandEvent,
  CommandFeedbackEvent,
  InstanceStatusEvent,
  GuildGeneralEvent,
  MinecraftChatEvent,
  BroadcastEvent
} from './application-event.js'
import type { ClientInstance } from './client-instance.js'

/**
 * Abstract class with abstract callback functions that must be implemented
 * to integrate bridge to other services. Use this class as a base when connecting two services.
 */
export default abstract class BridgeHandler<K extends ClientInstance<unknown>> {
  protected readonly application: Application
  protected readonly clientInstance: K

  constructor(application: Application, clientInstance: K) {
    this.application = application
    this.clientInstance = clientInstance

    this.application.on('command', (event) => {
      void Promise.resolve(this.onCommand(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling command event')
      )
    })
    this.application.on('commandFeedback', (event) => {
      void Promise.resolve(this.onCommandFeedback(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling command feedback')
      )
    })

    this.application.on('chat', (event) => {
      void Promise.resolve(this.onChat(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling chat event')
      )
    })

    this.application.on('guildPlayer', (event) => {
      void Promise.resolve(this.onGuildPlayer(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
    this.application.on('guildGeneral', (event) => {
      void Promise.resolve(this.onGuildGeneral(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling guildGeneral event')
      )
    })
    this.application.on('minecraftChatEvent', (event) => {
      void Promise.resolve(this.onMinecraftChatEvent(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling minecraftChat event')
      )
    })
    this.application.on('instanceStatus', (event) => {
      void Promise.resolve(this.onInstance(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling instance event')
      )
    })
    this.application.on('broadcast', (event) => {
      void Promise.resolve(this.onBroadcast(event)).catch(
        this.clientInstance.errorHandler.promiseCatch('handling broadcast event')
      )
    })
  }

  abstract onCommand(event: CommandEvent): void | Promise<void>

  abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  abstract onChat(event: ChatEvent): void | Promise<void>

  abstract onGuildPlayer(event: GuildPlayerEvent): void | Promise<void>

  abstract onGuildGeneral(event: GuildGeneralEvent): void | Promise<void>

  abstract onMinecraftChatEvent(event: MinecraftChatEvent): void | Promise<void>

  abstract onInstance(event: InstanceStatusEvent): void | Promise<void>

  abstract onBroadcast(event: BroadcastEvent): void | Promise<void>
}
