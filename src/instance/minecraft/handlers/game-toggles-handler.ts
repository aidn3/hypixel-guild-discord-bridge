import assert from 'node:assert'

import type { Logger } from 'log4js'
import type { Client } from 'minecraft-protocol'
import PromiseQueue from 'promise-queue'

import type Application from '../../../application.js'
import type { InstanceType, MinecraftRawChatEvent } from '../../../common/application-event.js'
import { ChannelType, Color, MinecraftSendChatPriority } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { GameToggleConfig } from '../../../core/minecraft/minecraft-accounts'
import Duration from '../../../utility/duration'
import { setIntervalAsync, setTimeoutAsync } from '../../../utility/scheduling'
import { sleep } from '../../../utility/shared-utility'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class GameTogglesHandler extends SubInstance<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  /*
   Wait for client to be afk in the world before allowing the routine
   */
  private static readonly TillReady = Duration.seconds(10)
  private readyRefresh: undefined | NodeJS.Timeout

  /*
    Periodical check to ensure everything is toggled and ready.
    Send toggle commands if something isn't proper
   */
  private static readonly ResendEvery = Duration.seconds(10)

  private ready = false
  private prepared = false
  private sentCommands = 0
  private singletonQueue = new PromiseQueue(1)

  private config: GameToggleConfig | undefined
  private lastUuid: string | undefined = undefined

  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<InstanceType.Minecraft>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    setIntervalAsync(
      async () => {
        if (!this.ready) return

        const uuid = this.clientInstance.uuid()
        if (uuid === undefined) return

        const config = this.getConfig(uuid)

        if (this.singletonQueue.getQueueLength() == 0 && this.singletonQueue.getPendingLength() == 0) {
          await this.singletonQueue.add(() => this.sendToggles(config))
        }
      },
      {
        delay: GameTogglesHandler.ResendEvery,
        errorHandler: this.errorHandler.promiseCatch('check and send periodical game toggles if needed')
      }
    )

    this.application.on('chat', (event) => {
      if (event.instanceName !== this.clientInstance.instanceName) return

      const uuid = this.clientInstance.uuid()
      assert.ok(uuid !== undefined)
      const config = this.getConfig(uuid)

      if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
        config.guildChatEnabled = true
        this.application.core.minecraftAccounts.set(uuid, config)
      }
    })

    this.application.on('minecraftChat', (event: MinecraftRawChatEvent) => {
      if (event.message.length === 0 || event.instanceName !== this.clientInstance.instanceName) return

      const uuid = this.clientInstance.uuid()
      if (uuid === undefined) {
        this.logger.warn("minecraftChat event was received while the handler isn't ready yet. Ignoring this event.")
        return
      }
      const config = this.getConfig(uuid)

      if (event.message.startsWith('Your online status has been set to Online')) {
        config.playerOnlineStatusEnabled = true
        this.application.core.minecraftAccounts.set(uuid, config)
      }
      if (event.message.startsWith('Selected language: ')) {
        config.selectedEnglish = event.message.startsWith('Selected Language: English')
        this.application.core.minecraftAccounts.set(uuid, config)
      }

      if (event.message.startsWith('Enabled guild online mode!')) {
        config.guildAllEnabled = false
        this.application.core.minecraftAccounts.set(uuid, config)
      }
      if (event.message.startsWith('Disabled guild online mode!')) {
        config.guildAllEnabled = true
        this.application.core.minecraftAccounts.set(uuid, config)
      }

      if (event.message.startsWith('Enabled guild chat!')) {
        config.guildChatEnabled = true
        this.application.core.minecraftAccounts.set(uuid, config)
      }
      if (event.message.startsWith('Disabled guild chat!')) {
        config.guildChatEnabled = false
        this.application.core.minecraftAccounts.set(uuid, config)
      }

      if (event.message.startsWith('Enabled guild join/leave notifications!')) {
        config.guildNotificationsEnabled = true
        this.application.core.minecraftAccounts.set(uuid, config)
      }
      if (event.message.startsWith('Disabled guild join/leave notifications!')) {
        config.guildNotificationsEnabled = false
        this.application.core.minecraftAccounts.set(uuid, config)
      }
    })
  }

  private allPrepared(config: GameToggleConfig): boolean {
    return (
      config.playerOnlineStatusEnabled &&
      config.selectedEnglish &&
      config.guildAllEnabled &&
      config.guildChatEnabled &&
      config.guildNotificationsEnabled
    )
  }

  private async sendToggles(config: GameToggleConfig): Promise<void> {
    if (this.sentCommands > 0) {
      this.logger.warn('Commands are already queued for game-toggles-handler. Skipping this loop')
      return
    }

    if (!this.prepared && this.allPrepared(config)) {
      this.prepared = true
      await this.application.emit('broadcast', {
        ...this.eventHelper.fillBaseEvent(),

        channels: [ChannelType.Public],
        color: Color.Good,

        user: undefined,
        message: `Account at ${this.clientInstance.instanceName} has finished discovery phase. All ready!`
      })
      return
    }

    const lock = await this.clientInstance.acquireLimbo()
    try {
      // exit limbo and go to main lobby, since some settings are only available there
      await this.clientInstance.send('/lobby', MinecraftSendChatPriority.High, undefined)
      await sleep(2000)

      if (!config.playerOnlineStatusEnabled) await this.queueSend('/status online')
      if (!config.selectedEnglish) await this.queueSend('/language english')

      if (!config.guildAllEnabled) await this.queueSend('/guild onlinemode')
      if (!config.guildChatEnabled) await this.queueSend('/guild toggle')
      if (!config.guildNotificationsEnabled) await this.queueSend('/guild notifications')
    } finally {
      // free lock
      lock.resolve()
    }
  }

  private async queueSend(command: string): Promise<void> {
    this.sentCommands++
    await this.clientInstance
      .send(command, MinecraftSendChatPriority.High, undefined)
      .catch(this.errorHandler.promiseCatch('executing a command'))
      .finally(() => {
        this.sentCommands--
      })
  }

  override registerEvents(clientSession: ClientSession): void {
    this.initializeReadySignal(clientSession.client)
  }

  private initializeReadySignal(client: Client): void {
    // first spawn packet
    client.on('login', () => {
      void this.setPrepared().catch(this.errorHandler.promiseCatch('set game-toggle status to prepared'))
      this.resetReady()
    })
    // change world packet
    client.on('respawn', () => {
      void this.setPrepared().catch(this.errorHandler.promiseCatch('set game-toggle status to prepared'))
      this.resetReady()
    })
  }

  private resetReady(): void {
    this.ready = false

    this.readyRefresh ??= setTimeoutAsync(
      async () => {
        const uuid = this.clientInstance.uuid()
        assert.ok(uuid !== undefined)
        const config = this.application.core.minecraftAccounts.get(uuid)

        this.ready = true

        // already waited for the client to be ready
        if (this.singletonQueue.getQueueLength() == 0 && this.singletonQueue.getPendingLength() == 0) {
          await this.singletonQueue.add(() => this.sendToggles(config))
        }
      },
      {
        delay: GameTogglesHandler.TillReady,
        errorHandler: this.errorHandler.promiseCatch('checking and sending toggles after being ready')
      }
    )

    this.readyRefresh.refresh()
  }

  private async setPrepared(): Promise<void> {
    const newUuid = this.clientInstance.uuid()
    const username = this.clientInstance.username()
    assert.ok(newUuid !== undefined)
    assert.ok(username !== undefined)

    const config = this.application.core.minecraftAccounts.get(newUuid)
    if (this.allPrepared(config)) {
      this.prepared = true
    } else {
      this.prepared = false
      if (this.lastUuid === undefined) {
        this.lastUuid = newUuid
        await this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Info,

          user: undefined,
          message:
            `Minecraft account ${username}/${newUuid} is not prepared to be used in the application yet.\n` +
            'Application will run through a discovery phase for one minute to prepare the account. ' +
            'In the mean time, communication and messages might be experience interruptions. ' +
            'Do not execute anything till the discovery phase has finished.'
        })
      }
    }
  }

  private getConfig(currentUuid: string): GameToggleConfig {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    assert.ok(currentUuid !== undefined)

    this.lastUuid ??= currentUuid
    if (currentUuid !== this.lastUuid) {
      throw new Error(
        `Minecraft instance integrity is violated. Instance started with account uuid=${this.lastUuid}, but now changed to uuid=${currentUuid}`
      )
    }

    this.config ??= this.application.core.minecraftAccounts.get(currentUuid)
    return this.config
  }
}
