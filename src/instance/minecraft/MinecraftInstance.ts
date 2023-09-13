import MineFlayer = require('mineflayer')
import ChatManager from './ChatManager'
import Application from '../../Application'
import { ClientInstance, LOCATION, SCOPE, Status } from '../../common/ClientInstance'
import {
  ChatEvent,
  ClientEvent,
  EventType,
  InstanceEventType,
  MinecraftCommandResponse
} from '../../common/ApplicationEvent'
import RawChatHandler from './handlers/RawChatHandler'
import SelfBroadcastHandler from './handlers/SelfBroadcastHandler'
import SendChatHandler from './handlers/SendChatHandler'
import ErrorHandler from './handlers/ErrorHandler'
import StateHandler from './handlers/StateHandler'
import MinecraftConfig from './common/MinecraftConfig'
import { resolveProxyIfExist } from './common/ProxyHandler'
import RateLimiter from '../../util/RateLimiter'

const commandsLimiter = new RateLimiter(1, 1000)

export default class MinecraftInstance extends ClientInstance<MinecraftConfig> {
  private readonly handlers
  client: MineFlayer.Bot | undefined

  constructor(app: Application, instanceName: string, config: MinecraftConfig) {
    super(app, instanceName, LOCATION.MINECRAFT, config)

    this.status = Status.FRESH
    this.handlers = [
      new ErrorHandler(this),
      new StateHandler(this),
      new RawChatHandler(this),
      new SelfBroadcastHandler(this),
      new SendChatHandler(this),

      new ChatManager(this)
    ]

    this.app.on('restartSignal', (event) => {
      // null is strictly checked due to api specification
      if (event.targetInstanceName === null || event.targetInstanceName === this.instanceName) {
        this.logger.log('instance has received restart signal')
        void this.connect()
      }
    })

    this.app.on('minecraftCommandResponse', (event: MinecraftCommandResponse) => {
      if (event.instanceName !== this.instanceName) {
        void this.send(this.formatChatMessage('gc', event.username, undefined, event.fullCommand))
      }

      void this.send(`/gc ${event.commandResponse}`)
    })

    this.app.on('chat', (event: ChatEvent) => {
      if (event.instanceName === this.instanceName) return

      if (event.scope === SCOPE.PUBLIC) {
        void this.send(this.formatChatMessage('gc', event.username, event.replyUsername, event.message))
      } else if (event.scope === SCOPE.OFFICER) {
        void this.send(this.formatChatMessage('oc', event.username, event.replyUsername, event.message))
      }
    })

    this.app.on('event', (event: ClientEvent) => {
      if (event.instanceName === this.instanceName) return
      if (event.scope !== SCOPE.PUBLIC) return
      if (event.removeLater) return
      if (event.name === EventType.COMMAND) return
      if (event.name === EventType.BLOCK) return
      if (event.name === EventType.REPEAT) return

      void this.send(`/gc @[${event.instanceName ?? 'Main'}]: ${event.message}`)
    })
  }

  async connect(): Promise<void> {
    if (this.client != null) this.client.quit()

    this.client = MineFlayer.createBot({ ...this.config.botOptions, ...resolveProxyIfExist(this.logger, this.config) })
    this.app.emit('instance', {
      localEvent: true,
      instanceName: this.instanceName,
      location: LOCATION.MINECRAFT,
      type: InstanceEventType.create,
      message: 'Minecraft instance has been created'
    })

    this.handlers.forEach((handler) => {
      handler.registerEvents()
    })
  }

  username(): string | undefined {
    return this.client?.player?.username
  }

  uuid(): string | undefined {
    const uuid = this.client?.player?.uuid
    return uuid != null ? uuid.split('-').join('') : undefined
  }

  async send(message: string): Promise<void> {
    this.logger.debug(`Queuing message to send: ${message}`)
    await commandsLimiter.wait().then(() => {
      if (this?.client?.player != null) {
        this.client.chat(message)
      }
    })
  }

  private formatChatMessage(
    prefix: string,
    username: string,
    replyUsername: string | undefined,
    message: string
  ): string {
    let full = `/${prefix} ${this.config.bridgePrefix}`

    if (this.app.config.general.displayInstanceName) full += `[${this.instanceName}] `

    full += username
    if (replyUsername != null) full += `⇾${replyUsername}`
    full += ': '
    full += message
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
      .trim()

    return full
  }
}
