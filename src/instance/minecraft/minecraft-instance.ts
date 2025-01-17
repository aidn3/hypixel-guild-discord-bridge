import { createClient, states } from 'minecraft-protocol'

import type { MinecraftInstanceConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'
import RateLimiter from '../../util/rate-limiter.js'

import ChatManager from './chat-manager.js'
import ClientSession from './client-session.js'
import { resolveProxyIfExist } from './common/proxy-handler.js'
import ErrorHandler from './handlers/error-handler.js'
import SelfbroadcastHandler from './handlers/selfbroadcast-handler.js'
import StateHandler, { QuitOwnVolition } from './handlers/state-handler.js'
import MinecraftBridge from './minecraft-bridge.js'

export default class MinecraftInstance extends ClientInstance<MinecraftInstanceConfig> {
  readonly defaultBotConfig = {
    host: 'me.hypixel.net',
    port: 25_565,
    version: '1.17.1'
  }

  clientSession: ClientSession | undefined

  readonly bridgePrefix: string

  private readonly bridge: MinecraftBridge
  private readonly commandsLimiter = new RateLimiter(1, 1000)

  constructor(app: Application, instanceName: string, config: MinecraftInstanceConfig, bridgePrefix: string) {
    super(app, instanceName, InstanceType.Minecraft, config)

    this.bridge = new MinecraftBridge(app, this, this.logger, this.errorHandler)
    this.bridgePrefix = bridgePrefix
  }

  connect(): void {
    this.clientSession?.client.end(QuitOwnVolition)

    const client = createClient({
      ...this.defaultBotConfig,
      username: this.config.email,
      auth: 'microsoft',
      ...resolveProxyIfExist(this.logger, this.config.proxy, this.defaultBotConfig),
      onMsaCode: (code) => {
        this.application.emit('statusMessage', {
          localEvent: true,
          instanceName: this.instanceName,
          instanceType: InstanceType.Minecraft,
          message: `Login pending. Authenticate using this link: ${code.verification_uri}?otc=${code.user_code}`
        })
      }
    })

    this.clientSession = new ClientSession(client)

    const handlers = [
      new ErrorHandler(this.application, this, this.logger, this.errorHandler),
      new StateHandler(this.application, this, this.logger, this.errorHandler),
      new SelfbroadcastHandler(this.application, this, this.logger, this.errorHandler),
      new ChatManager(this.application, this, this.logger, this.errorHandler)
    ]

    for (const handler of handlers) {
      handler.registerEvents()
    }

    this.setAndBroadcastNewStatus(Status.Connecting, 'Minecraft instance has been created')
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
