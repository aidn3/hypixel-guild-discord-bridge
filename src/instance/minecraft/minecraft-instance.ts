import { createClient, states } from 'minecraft-protocol'

import type { MinecraftInstanceConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceEventType, InstanceType } from '../../common/application-event.js'
import { ClientInstance } from '../../common/client-instance.js'
import RateLimiter from '../../util/rate-limiter.js'

import BridgeHandler from './bridge-handler.js'
import ChatManager from './chat-manager.js'
import ClientSession from './client-session.js'
import { resolveProxyIfExist } from './common/proxy-handler.js'
import ErrorHandler from './handlers/error-handler.js'
import SelfbroadcastHandler from './handlers/selfbroadcast-handler.js'
import SendchatHandler from './handlers/sendchat-handler.js'
import StateHandler, { QuitOwnVolition } from './handlers/state-handler.js'

export default class MinecraftInstance extends ClientInstance<MinecraftInstanceConfig> {
  readonly defaultBotConfig = {
    host: 'host.docker.internal',
    port: 25_565,
    version: '1.17.1'
  }

  private readonly commandsLimiter = new RateLimiter(1, 1000)
  readonly bridgePrefix: string

  clientSession: ClientSession | undefined

  constructor(app: Application, instanceName: string, config: MinecraftInstanceConfig, bridgePrefix: string) {
    super(app, instanceName, InstanceType.MINECRAFT, config)

    new BridgeHandler(app, this)
    this.bridgePrefix = bridgePrefix
  }

  connect(): void {
    this.clientSession?.client.end(QuitOwnVolition)

    const client = createClient({
      ...this.defaultBotConfig,
      username: 'test_bot',
      auth: 'offline',
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

    this.clientSession = new ClientSession(client)

    const handlers = [
      new ErrorHandler(this),
      new StateHandler(this),
      new SelfbroadcastHandler(this),
      new SendchatHandler(this),
      new ChatManager(this)
    ]

    for (const handler of handlers) {
      handler.registerEvents()
    }

    this.app.emit('instance', {
      localEvent: true,
      instanceName: this.instanceName,
      instanceType: InstanceType.MINECRAFT,
      type: InstanceEventType.create,
      message: 'Minecraft instance has been created'
    })
  }

  username(): string | undefined {
    return this.clientSession?.client.username
  }

  uuid(): string | undefined {
    const uuid = this.clientSession?.client.uuid
    return uuid == undefined ? undefined : uuid.split('-').join('')
  }

  async send(message: string): Promise<void> {
    message = message
      .split('\n')
      .map((chunk) => chunk.trim())
      .join(' ')

    this.logger.debug(`Queuing message to send: ${message}`)
    await this.commandsLimiter.wait().then(() => {
      if (this.clientSession?.client.state === states.PLAY) {
        if (message.length > 250) {
          message = message.slice(0, 250) + '...'
          this.logger.warn(`Long message truncated: ${message}`)
        }

        this.clientSession.client.chat(message)
      }
    })
  }
}
