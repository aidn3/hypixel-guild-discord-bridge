import type { Registry } from 'prom-client'
import { Counter } from 'prom-client'

import type { ChatEvent, ClientEvent, CommandEvent } from '../../common/application-event.js'

// location and scope keys are preserved and not renamed like the rest for backwards compatibility
export default class ApplicationMetrics {
  private readonly chatMetrics
  private readonly commandMetrics
  private readonly eventMetrics

  constructor(register: Registry, prefix: string) {
    this.chatMetrics = new Counter({
      name: prefix + 'chat',
      help: 'Chat messages sent in guild-bridge.',
      labelNames: ['location', 'scope', 'instance']
    })
    register.registerMetric(this.chatMetrics)

    this.commandMetrics = new Counter({
      name: prefix + 'command',
      help: 'Commands executed in guild-bridge.',
      labelNames: ['location', 'scope', 'instance', 'command']
    })
    register.registerMetric(this.commandMetrics)

    this.eventMetrics = new Counter({
      name: prefix + 'event',
      help: 'Events happened in guild-bridge.',
      labelNames: ['location', 'scope', 'instance', 'event']
    })
    register.registerMetric(this.eventMetrics)
  }

  onChatEvent(event: ChatEvent): void {
    this.chatMetrics.inc({
      location: event.instanceType,
      scope: event.channelType,
      instance: event.instanceName
    })
  }

  onCommandEvent(event: CommandEvent): void {
    this.commandMetrics.inc({
      location: event.instanceType,
      scope: event.channelType,
      instance: event.instanceName,
      command: event.commandName
    })
  }

  onClientEvent(event: ClientEvent): void {
    this.eventMetrics.inc({
      location: event.instanceType,
      scope: event.channelType,
      instance: event.instanceName,
      event: event.eventType
    })
  }
}
