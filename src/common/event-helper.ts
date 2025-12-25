import type { BaseEvent, InstanceType } from './application-event.js'

export default class EventHelper<K extends InstanceType> {
  constructor(
    private readonly instanceName: string,
    private readonly instanceType: K,
    private readonly bridgeId?: string
  ) {}
  private lastId = 0

  public generate(): string {
    return `${this.instanceType}:${this.instanceName}:${this.lastId++}`
  }

  public fillBaseEvent(): BaseEvent & { instanceType: K; bridgeId?: string } {
    const event: BaseEvent & { instanceType: K; bridgeId?: string } = {
      eventId: this.generate(),
      createdAt: Date.now(),

      instanceType: this.instanceType,
      instanceName: this.instanceName
    }

    if (this.bridgeId !== undefined) {
      event.bridgeId = this.bridgeId
    }

    return event
  }
}
