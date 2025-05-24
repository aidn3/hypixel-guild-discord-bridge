import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import type { Logger } from 'log4js'
import type { Client } from 'minecraft-protocol'

import type Application from '../../../application.js'
import type { InstanceType, MinecraftRawChatEvent } from '../../../common/application-event.js'
import { ChannelType, Color, MinecraftSendChatPriority } from '../../../common/application-event.js'
import { ConfigManager } from '../../../common/config-manager.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class GameTogglesHandler extends EventHandler<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private readonly toggleDirectory: string

  /*
   Wait for client to be afk in the world before allowing the routine
   */
  private static readonly TillReadyMilliseconds = 10 * 1000
  private readyRefresh: undefined | NodeJS.Timeout

  /*
    Periodical check to ensure everything is toggled and ready.
    Send toggle commands if something isn't proper
   */
  private static readonly ResendEveryMilliseconds = 10 * 1000

  private ready = false
  private prepared = false
  private sentCommands = 0

  private config: ConfigManager<GameToggleConfig> | undefined
  private lastUuid: string | undefined = undefined

  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<InstanceType.Minecraft>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.toggleDirectory = this.application.getConfigFilePath('minecraft-toggles')
    fs.mkdirSync(this.toggleDirectory, { recursive: true })

    setInterval(() => {
      if (!this.ready) return
      this.sendToggles()
    }, GameTogglesHandler.ResendEveryMilliseconds)

    this.application.on('chat', (event) => {
      if (event.instanceName !== this.clientInstance.instanceName) return
      assert(this.config)

      if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
        this.config.data.guildChatEnabled = true
        this.config.markDirty()
      }
    })

    this.application.on('minecraftChat', (event: MinecraftRawChatEvent) => {
      if (event.message.length === 0 || event.instanceName !== this.clientInstance.instanceName) return
      assert(this.config)

      if (event.message.startsWith('Your online status has been set to Online')) {
        this.config.data.playerOnlineStatusEnabled = true
        this.config.markDirty()
      }

      if (event.message.startsWith('Enabled guild online mode!')) {
        this.config.data.guildAllEnabled = false
        this.config.markDirty()
      }
      if (event.message.startsWith('Disabled guild online mode!')) {
        this.config.data.guildAllEnabled = true
        this.config.markDirty()
      }

      if (event.message.startsWith('Enabled guild chat!')) {
        this.config.data.guildChatEnabled = true
        this.config.markDirty()
      }
      if (event.message.startsWith('Disabled guild chat!')) {
        this.config.data.guildChatEnabled = false
        this.config.markDirty()
      }

      if (event.message.startsWith('Enabled guild join/leave notifications!')) {
        this.config.data.guildNotificationsEnabled = true
        this.config.markDirty()
      }
      if (event.message.startsWith('Disabled guild join/leave notifications!')) {
        this.config.data.guildNotificationsEnabled = false
        this.config.markDirty()
      }
    })
  }

  private allPrepared(config: ConfigManager<GameToggleConfig>): boolean {
    return (
      config.data.playerOnlineStatusEnabled &&
      config.data.guildAllEnabled &&
      config.data.guildChatEnabled &&
      config.data.guildNotificationsEnabled
    )
  }

  private sendToggles(): void {
    if (this.sentCommands > 0) {
      this.logger.warn('Commands are already queued for game-toggles-handler. Skipping this loop')
      return
    }

    assert(this.config)
    if (!this.prepared && this.allPrepared(this.config)) {
      this.prepared = true
      this.application.emit('broadcast', {
        ...this.eventHelper.fillBaseEvent(),

        channels: [ChannelType.Public],
        color: Color.Good,

        username: undefined,
        message: `Account at ${this.clientInstance.instanceName} has finished discovery phase. All ready!`
      })
      return
    }

    if (!this.config.data.playerOnlineStatusEnabled) this.queueSend('/status online')

    if (!this.config.data.guildAllEnabled) this.queueSend('/guild onlinemode')
    if (!this.config.data.guildChatEnabled) this.queueSend('/guild toggle')
    if (!this.config.data.guildNotificationsEnabled) this.queueSend('/guild notifications')
  }

  private queueSend(command: string): void {
    this.sentCommands++
    void this.clientInstance
      .send(command, MinecraftSendChatPriority.High, undefined)
      .catch(this.errorHandler.promiseCatch('executing a command'))
      .finally(() => {
        this.sentCommands--
      })
  }

  registerEvents(clientSession: ClientSession): void {
    this.initializeReadySignal(clientSession.client)
  }

  private initializeReadySignal(client: Client): void {
    // first spawn packet
    client.on('login', () => {
      this.retrieveConfig()
      this.resetReady()
    })
    // change world packet
    client.on('respawn', () => {
      this.retrieveConfig()
      this.resetReady()
    })
  }

  private resetReady(): void {
    this.ready = false

    this.readyRefresh ??= setTimeout(() => {
      this.ready = true
      this.sendToggles() // already waited for the client to be ready
    }, GameTogglesHandler.TillReadyMilliseconds)

    this.readyRefresh.refresh()
  }

  private retrieveConfig() {
    const newUuid = this.clientInstance.uuid()
    const username = this.clientInstance.username()
    assert(newUuid !== undefined)
    assert(username !== undefined)

    this.lastUuid ??= newUuid
    if (newUuid !== this.lastUuid) {
      throw new Error(
        `Minecraft instance integrity is violated. Instance started with account uuid=${this.lastUuid}, but now changed to uuid=${newUuid}`
      )
    }

    if (this.config === undefined) {
      this.config = new ConfigManager(this.application, path.join(this.toggleDirectory, `${newUuid}.json`), {
        playerOnlineStatusEnabled: false,

        guildAllEnabled: false,
        guildChatEnabled: false,
        guildNotificationsEnabled: false
      })

      if (this.allPrepared(this.config)) {
        this.prepared = true
      } else {
        this.prepared = false
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Info,

          username: undefined,
          message:
            `Minecraft account ${username}/${newUuid} is not prepared to be used in the application yet.\n` +
            'Application will run through a discovery phase for one minute to prepare the account. ' +
            'In the mean time, communication and messages might be experience interruptions. ' +
            'Do not execute anything till the discovery phase has finished.'
        })
      }
    }
  }
}

interface GameToggleConfig {
  playerOnlineStatusEnabled: boolean

  guildAllEnabled: boolean
  guildChatEnabled: boolean
  guildNotificationsEnabled: boolean
}
