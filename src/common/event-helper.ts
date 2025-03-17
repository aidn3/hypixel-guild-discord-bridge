import type { BaseEvent, InstanceType } from './application-event.js'

export default class EventHelper<K extends InstanceType> {
  constructor(
    private readonly instanceName: string,
    private readonly instanceType: K
  ) {}
  private lastId = 0

  public generate(): string {
    return `${this.instanceType}:${this.instanceName}:${this.lastId++}`
  }

  public fillBaseEvent(): BaseEvent & { instanceType: K } {
    return {
      localEvent: true,
      eventId: this.generate(),

      instanceType: this.instanceType,
      instanceName: this.instanceName
    }
  }
}
