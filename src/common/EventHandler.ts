import { ClientInstance } from './ClientInstance'

export default abstract class EventHandler<K extends ClientInstance<any>> {
  clientInstance: K

  constructor(clientInstance: K) {
    this.clientInstance = clientInstance
  }

  abstract registerEvents(): void
}
