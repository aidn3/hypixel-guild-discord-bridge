import {ClientInstance} from "./ClientInstance"

export default abstract class EventHandler<K extends ClientInstance> {
    clientInstance: K

    protected constructor(clientInstance: K) {
        this.clientInstance = clientInstance
    }

    abstract registerEvents(): void
}
