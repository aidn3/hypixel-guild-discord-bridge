import type { Client } from 'minecraft-protocol'
import { createClient, states } from 'minecraft-protocol'
import PrismarineChat from 'prismarine-chat'
import type { NBT } from 'prismarine-nbt'
import PrismarineRegistry from 'prismarine-registry'

import type Application from '../../application'
import type { MinecraftInstanceConfig } from '../../application-config'
import type { ChatEvent, ClientEvent, CommandEvent } from '../../common/application-event'
import { ChannelType, EventType, InstanceEventType, InstanceType } from '../../common/application-event'
import { ClientInstance, Status } from '../../common/client-instance'
import RateLimiter from '../../util/rate-limiter'
import { antiSpamString } from '../../util/shared-util'

import ChatManager from './chat-manager'
import { resolveProxyIfExist } from './common/proxy-handler'
import ErrorHandler from './handlers/error-handler'
import SelfbroadcastHandler from './handlers/selfbroadcast-handler'
import SendchatHandler from './handlers/sendchat-handler'
import StateHandler, { QUIT_OWN_VOLITION } from './handlers/state-handler'

const commandsLimiter = new RateLimiter(1, 1000)

export default class MinecraftInstance extends ClientInstance<MinecraftInstanceConfig> {
  defaultBotConfig = {
    host: 'me.hypixel.net',
    port: 25_565,
    version: '1.17.1'
  }
  readonly bridgePrefix: string
  private readonly handlers
  readonly registry
  readonly prismChat
  client: Client | undefined

  constructor(app: Application, instanceName: string, config: MinecraftInstanceConfig, bridgePrefix: string) {
    super(app, instanceName, InstanceType.MINECRAFT, config)

    this.bridgePrefix = bridgePrefix
    this.status = Status.FRESH
    this.handlers = [
      new ErrorHandler(this),
      new StateHandler(this),
      new SelfbroadcastHandler(this),
      new SendchatHandler(this),
      new ChatManager(this)
    ]

    this.registry = PrismarineRegistry(this.defaultBotConfig.version)
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

    this.app.on('command', (event: CommandEvent) => {
      if (
        event.instanceType === InstanceType.MINECRAFT &&
        event.instanceName === this.instanceName &&
        event.alreadyReplied
      ) {
        return
      }

      const finalResponse = `${event.commandResponse} @${antiSpamString()}`
      switch (event.channelType) {
        case ChannelType.PUBLIC: {
          void this.send(`/gc ${finalResponse}`)
          break
        }
        case ChannelType.OFFICER: {
          void this.send(`/oc ${finalResponse}`)
          break
        }
        case ChannelType.PRIVATE: {
          if (event.instanceType !== InstanceType.MINECRAFT || event.instanceName !== this.instanceName) return
          void this.send(`/msg ${event.username} ${finalResponse}`)
          break
        }
        default: {
          break
        }
      }
    })

    this.app.on('chat', (event: ChatEvent) => {
      if (event.instanceName === this.instanceName) return

      if (event.channelType === ChannelType.PUBLIC) {
        void this.send(this.formatChatMessage('gc', event.username, event.replyUsername, event.message))
      } else if (event.channelType === ChannelType.OFFICER) {
        void this.send(this.formatChatMessage('oc', event.username, event.replyUsername, event.message))
      }
    })

    this.app.on('event', (event: ClientEvent) => {
      if (event.instanceName === this.instanceName) return
      if (event.channelType !== ChannelType.PUBLIC) return
      if (event.removeLater) return
      if (event.eventType === EventType.BLOCK) return
      if (event.eventType === EventType.REPEAT) return

      void this.send(`/gc @[${event.instanceName}]: ${event.message}`)
    })
  }

  connect(): void {
    this.client?.end(QUIT_OWN_VOLITION)

    this.client = createClient({
      ...this.defaultBotConfig,
      username: this.config.email,
      auth: 'microsoft',
      ...resolveProxyIfExist(this.logger, this.config.proxy, this.defaultBotConfig),
      onMsaCode: (code) => {
        this.app.emit('statusMessage', {
          localEvent: true,
          instanceName: this.instanceName,
          instanceType: InstanceType.MINECRAFT,
          message: `Login pending. Authenticate using this link: ${code.verification_uri}?otc=${code.user_code}`
        })
      }
    })
    this.listenForRegistry(this.client)

    this.app.emit('instance', {
      localEvent: true,
      instanceName: this.instanceName,
      instanceType: InstanceType.MINECRAFT,
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
    let full = `/${prefix} ${this.bridgePrefix}`

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
