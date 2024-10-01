import type Application from '../application.js'

import type { ChatEvent, ClientEvent, CommandEvent, CommandFeedbackEvent, InstanceEvent } from './application-event.js'
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

    this.application.on('command', (event: CommandEvent) => {
      void this.onCommand(event)
    })
    this.application.on('commandFeedback', (event: CommandFeedbackEvent) => {
      void this.onCommandFeedback(event)
    })

    this.application.on('chat', (event: ChatEvent) => {
      void this.onChat(event)
    })

    this.application.on('event', (event: ClientEvent) => {
      void this.onClientEvent(event)
    })
    this.application.on('instance', (event: InstanceEvent) => {
      void this.onInstance(event)
    })
  }

  abstract onCommand(event: CommandEvent): void | Promise<void>

  abstract onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void>

  abstract onChat(event: ChatEvent): void | Promise<void>

  abstract onClientEvent(event: ClientEvent): void | Promise<void>

  abstract onInstance(event: InstanceEvent): void | Promise<void>
}
