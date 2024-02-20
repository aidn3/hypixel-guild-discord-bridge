import * as assert from 'node:assert'
import PrismarineRegistry = require('prismarine-registry')
import { NBT } from 'prismarine-nbt'
import { Client, createClient, states } from 'minecraft-protocol'
import * as PrismarineChat from 'prismarine-chat'
import Application from '../../Application'
import { ClientInstance, LOCATION, SCOPE, Status } from '../../common/ClientInstance'
import {
  ChatEvent,
  ClientEvent,
  EventType,
  InstanceEventType,
  MinecraftCommandResponse
} from '../../common/ApplicationEvent'
import RateLimiter from '../../util/RateLimiter'
import { antiSpamString } from '../../util/SharedUtil'
import ChatManager from './ChatManager'
import SelfBroadcastHandler from './handlers/SelfBroadcastHandler'
import SendChatHandler from './handlers/SendChatHandler'
import ErrorHandler from './handlers/ErrorHandler'
import StateHandler from './handlers/StateHandler'
import MinecraftConfig from './common/MinecraftConfig'
import { resolveProxyIfExist } from './common/ProxyHandler'

export const QUIT_OWN_VOLITION = 'disconnect.quitting'
const commandsLimiter = new RateLimiter(1, 1000)

export default class MinecraftInstance extends ClientInstance<MinecraftConfig> {
  private readonly handlers
  readonly registry
  readonly prismChat
  client: Client | undefined

  constructor(app: Application, instanceName: string, config: MinecraftConfig) {
    super(app, instanceName, LOCATION.MINECRAFT, config)

    this.status = Status.FRESH
    this.handlers = [
      new ErrorHandler(this),
      new StateHandler(this),
      new SelfBroadcastHandler(this),
      new SendChatHandler(this),
      new ChatManager(this)
    ]

    assert(config.botOptions.version)
    this.registry = PrismarineRegistry(config.botOptions.version)
    this.prismChat = PrismarineChat(this.registry)

    this.app.on('reconnectSignal', (event) => {
      // undefined is strictly checked due to api specification
      if (event.targetInstanceName === undefined || event.targetInstanceName === this.instanceName) {
        this.logger.log('instance has received restart signal')
        void this.send(`/gc @Instance restarting...`).then(() => {
          this.connect()
        })
      }
    })

    this.app.on('minecraftCommandResponse', (event: MinecraftCommandResponse) => {
      void this.send(`/gc ${event.commandResponse} @${antiSpamString()}`)
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

      void this.send(`/gc @[${event.instanceName}]: ${event.message}`)
    })
  }

  connect(): void {
    this.client?.end(QUIT_OWN_VOLITION)

    this.client = createClient({
      ...this.config.botOptions,
      ...resolveProxyIfExist(this.logger, this.config)
    })
    this.listenForRegistry(this.client)

    this.app.emit('instance', {
      localEvent: true,
      instanceName: this.instanceName,
      location: LOCATION.MINECRAFT,
      type: InstanceEventType.create,
      message: 'Minecraft instance has been created'
    })

    for (const handler of this.handlers) {
      handler.registerEvents()
    }
  }

  /*
   * Used to create special minecraft data.
   * Main purpose is to receive signed chat messages
   * and be able to format them based on how the server deems it
   */
  private listenForRegistry(client: Client): void {
    // 1.20.2+
    client.on('registry_data', (packet: { codec: NBT }) => {
      this.registry.loadDimensionCodec(packet.codec)
    })
    // older versions
    client.on('login', (packet: { dimensionCodec?: NBT }) => {
      if (packet.dimensionCodec) {
        this.registry.loadDimensionCodec(packet.dimensionCodec)
      }
    })
    client.on('respawn', (packet: { dimensionCodec?: NBT }) => {
      if (packet.dimensionCodec) {
        this.registry.loadDimensionCodec(packet.dimensionCodec)
      }
    })
  }

  username(): string | undefined {
    return this.client?.username
  }

  uuid(): string | undefined {
    const uuid = this.client?.uuid
    return uuid == undefined ? undefined : uuid.split('-').join('')
  }

  async send(message: string): Promise<void> {
    message = message
      .split('\n')
      .map((chunk) => chunk.trim())
      .join(' ')

    this.logger.debug(`Queuing message to send: ${message}`)
    await commandsLimiter.wait().then(() => {
      if (this.client?.state === states.PLAY) {
        if (message.length > 250) {
          message = message.slice(0, 250) + '...'
          this.logger.warn(`Long message truncated: ${message}`)
        }

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
    if (replyUsername != undefined) full += `⇾${replyUsername}`
    full += ': '
    full += message
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
      .trim()

    return full
  }
}
