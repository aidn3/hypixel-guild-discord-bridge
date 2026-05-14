import type { BaseEvent } from './application-event.js'
import type { Instance } from './instance'

export default class EventHelper<T extends Instance> {
  constructor(
    private readonly instanceId: number,
    private readonly instance: T
  ) {}
  private lastId = 0

  public generate(): string {
    return `${this.instanceId}:${this.lastId++}`
  }

  public fillBaseEvent(): Omit<BaseEvent, 'instance'> & { instance: T } {
    return {
      instance: this.instance,

      eventId: this.generate(),
      createdAt: Date.now()
    }
  }
}
