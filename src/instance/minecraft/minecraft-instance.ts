import fs from 'node:fs'

import { createClient, states } from 'minecraft-protocol'

import type { MinecraftInstanceConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type { MinecraftSendChatPriority } from '../../common/application-event.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'

import ChatManager from './chat-manager.js'
import ClientSession from './client-session.js'
import { resolveProxyIfExist } from './common/proxy-handler.js'
import { CommandType, SendQueue } from './common/send-queue.js'
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

  private readonly bridge: MinecraftBridge
  private readonly sendQueue: SendQueue
  private readonly adminUsername: string
  private readonly sessionDirectory: string

  constructor(app: Application, instanceName: string, config: MinecraftInstanceConfig, adminUsername: string) {
    super(app, instanceName, InstanceType.Minecraft, true, config)

    this.bridge = new MinecraftBridge(app, this, this.logger, this.errorHandler)
    this.adminUsername = adminUsername

    const sessionDirectoryName = 'minecraft-sessions'
    this.sessionDirectory = this.application.getConfigFilePath(sessionDirectoryName)
    fs.mkdirSync(this.sessionDirectory)
    this.application.applicationIntegrity.addConfigPath(sessionDirectoryName)

    this.sendQueue = new SendQueue(this.errorHandler, (command) => {
      this.sendNow(command)
    })
  }

  public resolvePermission(username: string, defaultPermission: Permission): Permission {
    if (username.toLowerCase() === this.adminUsername.toLowerCase()) return Permission.Admin
    return defaultPermission
  }

  connect(): void {
    this.clientSession?.client.end(QuitOwnVolition)

    const client = createClient({
      ...this.defaultBotConfig,
      username: this.config.email,
      auth: 'microsoft',
      profilesFolder: this.sessionDirectory,

      ...resolveProxyIfExist(this.logger, this.config.proxy, this.defaultBotConfig),
      onMsaCode: (code) => {
        this.application.emit('instanceMessage', {
          ...this.eventHelper.fillBaseEvent(),

          message: `Login pending. Authenticate using this link: ${code.verification_uri}?otc=${code.user_code}`
        })
      }
    })

    this.clientSession = new ClientSession(client)

    const handlers = [
      new StateHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler),
      new SelfbroadcastHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler),
      new ChatManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    ]

    for (const handler of handlers) {
      handler.registerEvents()
    }

    this.setAndBroadcastNewStatus(Status.Connecting, 'Minecraft instance has been created')
  }

  disconnect(): Promise<void> | void {
    this.clientSession?.client.end(QuitOwnVolition)
    this.setAndBroadcastNewStatus(Status.Ended, 'Minecraft instance has been disconnected')
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
    return this.sendQueue.lastId.get(CommandType.ChatMessage)
  }

  /**
   * returns {@link BaseEvent#eventId} of the last **GUILD ACTION** sent via {@link #send}.
   * Sent commands that aren't the type will NOT change this value.
   * commands the type are: guild chat message, guild change settings, guild info, etc.
   */
  getLastEventIdForSentGuildAction(): string | undefined {
    return this.sendQueue.lastId.get(CommandType.GuildCommand)
  }

  /**
   * Send a message/command via minecraft client.
   * The command will be queued to be sent in the future.
   *
   * @param message the message/command to send
   * @param priority when to handle the command
   * @param originEventId {@link BaseEvent#eventId} that resulted in this send. <code>undefined</code> if none.
   */
  async send(message: string, priority: MinecraftSendChatPriority, originEventId: string | undefined): Promise<void> {
    message = message
      .split('\n')
      .map((chunk) => chunk.trim())
      .join(' ')

    if (message.length > 250) {
      message = message.slice(0, 250) + '...'
      this.logger.warn(`Long message truncated: ${message}`)
    }

    this.logger.debug(`Queuing message to send: ${message}`)
    await this.sendQueue.queue(message, priority, originEventId)
  }

  private sendNow(message: string) {
    if (this.clientSession?.client.state === states.PLAY) {
      this.logger.debug(`Sending message now: ${message}`)
      this.clientSession.client.chat(message)
    } else {
      this.logger.warn(`Dropping message due to client not being connected and ready: ${message}`)
    }
  }
}
