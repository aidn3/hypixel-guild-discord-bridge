import type { Registry } from 'prom-client'
import { Counter } from 'prom-client'

import type {
  BaseInGameEvent,
  ChatEvent,
  CommandEvent,
  MinecraftReactiveEvent
} from '../../common/application-event.js'

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
      labelNames: ['location', 'instance', 'command']
    })
    register.registerMetric(this.commandMetrics)

    this.eventMetrics = new Counter({
      name: prefix + 'event',
      help: 'Events happened in guild-bridge.',
      labelNames: ['location', 'instance', 'event']
    })
    register.registerMetric(this.eventMetrics)
  }

  onChatEvent(event: ChatEvent): void {
    this.chatMetrics.inc({
      scope: event.channelType,
      instance: event.instance.getLogName()
    })
  }

  onCommandEvent(event: CommandEvent): void {
    this.commandMetrics.inc({
      instance: event.instance.getLogName(),
      command: event.commandName
    })
  }

  onClientEvent(event: BaseInGameEvent<string> | MinecraftReactiveEvent): void {
    this.eventMetrics.inc({
      instance: event.instance.getLogName(),
      event: event.type
    })
  }
}
