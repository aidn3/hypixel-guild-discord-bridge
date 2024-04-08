import { ClientInstance } from "./ClientInstance"

export default abstract class EventHandler<K extends ClientInstance<unknown>> {
  clientInstance: K

  constructor(clientInstance: K) {
    this.clientInstance = clientInstance
  }

  /**
   * Called every time the client reconnects.
   *
   * NOTE: Do not register events that listen on global events.
   * This function will be called multiple times with every reconstruct of the instance.
   * Use constructors functions if you want to register an event once
   */
  registerEvents(): void {
    // optional to implement
  }
}
