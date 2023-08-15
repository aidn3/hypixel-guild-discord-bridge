import { Counter, Registry } from 'prom-client'
import { ChatEvent, ClientEvent, CommandEvent } from '../../common/ApplicationEvent'

export default class ApplicationMetrics {
  private readonly chatMetrics
  private readonly commandMetrics
  private readonly eventMetrics

  constructor (register: Registry, prefix: string) {
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

  onChatEvent (event: ChatEvent): void {
    this.chatMetrics.inc({
      location: event.location,
      scope: event.scope,
      instance: event.instanceName
    })
  }

  onCommandEvent (event: CommandEvent): void {
    this.commandMetrics.inc({
      location: event.location,
      scope: event.scope,
      instance: event.instanceName,
      command: event.commandName
    })
  }

  onClientEvent (event: ClientEvent): void {
    this.eventMetrics.inc({
      location: event.location,
      scope: event.scope,
      instance: event.instanceName,
      event: event.name
    })
  }
}
