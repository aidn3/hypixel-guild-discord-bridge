import { createClient, states } from 'minecraft-protocol'

import type { MinecraftInstanceConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import RateLimiter from '../../util/rate-limiter.js'

import ChatManager from './chat-manager.js'
import ClientSession from './client-session.js'
import { resolveProxyIfExist } from './common/proxy-handler.js'
import ErrorHandler from './handlers/error-handler.js'
import SelfbroadcastHandler from './handlers/selfbroadcast-handler.js'
import StateHandler, { QuitOwnVolition } from './handlers/state-handler.js'
import MinecraftBridge from './minecraft-bridge.js'

export default class MinecraftInstance extends ConnectableInstance<MinecraftInstanceConfig, InstanceType.Minecraft> {
  readonly defaultBotConfig = {
    host: 'me.hypixel.net',
    port: 25_565,
    version: '1.17.1'
  }

  clientSession: ClientSession | undefined

  readonly bridgePrefix: string

  private readonly bridge: MinecraftBridge
  private readonly commandsLimiter = new RateLimiter(1, 1000)
  private readonly eventIdLimiter = new RateLimiter(1, 3000)
  private lastEventIdForChatMessage: string | undefined = undefined
  private lastEventIdForGuildAction: string | undefined = undefined

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
    return this.lastEventIdForChatMessage
  }

  /**
   * returns {@link BaseEvent#eventId} of the last **GUILD ACTION** sent via {@link #send}.
   * Sent commands that aren't the type will NOT change this value.
   * commands the type are: guild chat message, guild change settings, guild info, etc.
   */
  getLastEventIdForSentGuildAction(): string | undefined {
    return this.lastEventIdForGuildAction
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
    if (this.clientSession?.client.state !== states.PLAY) return

    const chatPrefix = ['/ac', '/pc', '/gc', '/oc', '/msg', '/whisper', '/w', 'tell']
    const guildPrefix = [
      '/g ',
      '/guild',
      '/gc',
      '/oc',
      '/chat guild',
      '/chat g',
      '/chat officer',
      '/chat o',
      '/c g',
      '/c guild',
      '/c o',
      '/c officer'
    ]

    const loweredCaseMessage = message.toLowerCase()
    if (
      chatPrefix.some((prefix) => loweredCaseMessage.startsWith(prefix)) ||
      !loweredCaseMessage.startsWith('/') // normal chat on default channel and not a command
    ) {
      await this.eventIdLimiter.wait()
      this.lastEventIdForChatMessage = originEventId
    }

    if (guildPrefix.some((prefix) => loweredCaseMessage.startsWith(prefix))) {
      await this.eventIdLimiter.wait()
      this.lastEventIdForGuildAction = originEventId
    }

    if (message.length > 250) {
      message = message.slice(0, 250) + '...'
      this.logger.warn(`Long message truncated: ${message}`)
    }

    this.clientSession.client.chat(message)
  }
}
