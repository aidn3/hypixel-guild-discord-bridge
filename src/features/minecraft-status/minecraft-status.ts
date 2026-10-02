import PromiseQueue from 'promise-queue'

import type Application from '../../application.js'
import type { InstanceStatus } from '../../common/application-event.js'
import { Instance } from '../../common/instance.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import MinecraftInstance from '../../instance/minecraft/minecraft-instance.js'

import { ButtonDatabase } from './button-database.js'
import { DiscordHandler } from './discord-handler.js'
import { StatusDatabase } from './status-database.js'

export type MinecraftStatusEntry = InstanceStatus & { instance: MinecraftInstance }

export class MinecraftStatus extends Instance {
  private readonly queue = new PromiseQueue(1)

  private readonly statusDatabase: StatusDatabase
  private readonly buttonDatabase: ButtonDatabase
  private readonly discordHandler: DiscordHandler

  constructor(application: Application, sqliteManager: SqliteManager) {
    super(application, 'minecraft-status')
    this.statusDatabase = new StatusDatabase(sqliteManager, this.logger)
    this.buttonDatabase = new ButtonDatabase(sqliteManager, this.logger)
    this.discordHandler = new DiscordHandler(
      this.application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.abortController.signal,
      this.statusDatabase,
      this.buttonDatabase
    )

    this.application.on('instanceStatus', async (event) => {
      if (!(event.instance instanceof MinecraftInstance)) return
      event.instance satisfies MinecraftInstance
      const typedEvent = event as MinecraftStatusEntry
      await this.queue
        .add(() => this.updateStatus(typedEvent))
        .catch(this.errorHandler.promiseCatch('handling Minecraft status logging'))
    })
  }

  private async updateStatus(event: MinecraftStatusEntry): Promise<void> {
    this.statusDatabase.add(event)

    await this.updateDiscord(event)
  }

  private async updateDiscord(event: MinecraftStatusEntry): Promise<void> {
    const client = this.application.discordInstance.getClient()
    if (!client.isReady()) return

    const configurations = this.application.core.discordConfigurations
    const channelIds = new Set([
      ...configurations.getPublicChannelIds(),
      ...configurations.getOfficerChannelIds(),
      ...configurations.getLoggerChannelIds()
    ])
    const association = this.application.discordInstance.getMessageAssociation()

    this.logger.trace('start updating discord')
    await this.discordHandler.send(client, association, channelIds, event)
    this.logger.trace('done updating discord')
  }
}
