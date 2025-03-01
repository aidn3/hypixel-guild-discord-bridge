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

export default class MinecraftInstance extends ClientInstance<MinecraftInstanceConfig, InstanceType.Minecraft> {
  readonly defaultBotConfig = {
    host: 'me.hypixel.net',
    port: 25_565,
    version: '1.17.1'
  }

  clientSession: ClientSession | undefined

  readonly bridgePrefix: string

  private readonly bridge: MinecraftBridge
  private readonly commandsLimiter = new RateLimiter(1, 1000)
  private readonly chatLimiter = new RateLimiter(1, 3000)
  private lastEventIdForSentChatMessage: string | undefined = undefined

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
          ...this.eventHelper.fillBaseEvent(),

          message: `Login pending. Authenticate using this link: ${code.verification_uri}?otc=${code.user_code}`
        })
      }
    })

    this.clientSession = new ClientSession(client)

    const handlers = [
      new ErrorHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler),
      new StateHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler),
      new SelfbroadcastHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler),
      new ChatManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)
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

  /**
   * returns {@link BaseEvent#eventId} of the last **MESSAGE** sent via {@link #send}.
   * Sent commands that aren't messages will NOT change this value.
   */
  getLastEventIdForSentChatMessage(): string | undefined {
    return this.lastEventIdForSentChatMessage
  }

  /**
   * Send a message/command via minecraft client.
   * The command will be queued to be sent in the future
   * @param message the message/command to send
   * @param originEventId {@link BaseEvent#eventId} that resulted in this send. <code>undefined</code> if none.
   */
  async send(message: string, originEventId: string | undefined): Promise<void> {
    message = message
      .split('\n')
      .map((chunk) => chunk.trim())
      .join(' ')

    this.logger.debug(`Queuing message to send: ${message}`)
    await this.commandsLimiter.wait()

    const loweredCaseMessage = message.toLowerCase()
    let isChatMessage = false
    if (
      loweredCaseMessage.startsWith('/ac') ||
      loweredCaseMessage.startsWith('/pc') ||
      loweredCaseMessage.startsWith('/gc') ||
      loweredCaseMessage.startsWith('/oc') ||
      loweredCaseMessage.startsWith('/msg') ||
      loweredCaseMessage.startsWith('/w') ||
      loweredCaseMessage.startsWith('/tell') ||
      loweredCaseMessage.startsWith('/whisper') ||
      !loweredCaseMessage.startsWith('/') // normal chat on default channel and not a command
    ) {
      isChatMessage = true
      await this.chatLimiter.wait()
    }

    if (this.clientSession?.client.state === states.PLAY) {
      if (message.length > 250) {
        message = message.slice(0, 250) + '...'
        this.logger.warn(`Long message truncated: ${message}`)
      }

      if (isChatMessage) this.lastEventIdForSentChatMessage = originEventId
      this.clientSession.client.chat(message)
    }
  }
}
