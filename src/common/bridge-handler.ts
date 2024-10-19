import type Application from '../application.js'

import type {
  ChatEvent,
  GuildPlayerEvent,
  CommandEvent,
  CommandFeedbackEvent,
  InstanceStatusEvent,
  GuildGeneralEvent,
  MinecraftChatEvent
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
      void this.onCommand(event)
    })
    this.application.on('commandFeedback', (event) => {
      void this.onCommandFeedback(event)
    })

    this.application.on('chat', (event) => {
      void this.onChat(event)
    })

    this.application.on('guildPlayer', (event) => {
      void this.onGuildPlayer(event)
    })
    this.application.on('guildGeneral', (event) => {
      void this.onGuildGeneral(event)
    })
    this.application.on('minecraftChatEvent', (event) => {
      void this.onMinecraftChatEvent(event)
    })
    this.application.on('instanceStatus', (event) => {
      void this.onInstance(event)
    })
  }

  abstract onCommand(event: CommandEvent): void | Promise<void>

  abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  abstract onChat(event: ChatEvent): void | Promise<void>

  abstract onGuildPlayer(event: GuildPlayerEvent): void | Promise<void>

  abstract onGuildGeneral(event: GuildGeneralEvent): void | Promise<void>

  abstract onMinecraftChatEvent(event: MinecraftChatEvent): void | Promise<void>

  abstract onInstance(event: InstanceStatusEvent): void | Promise<void>
}
