import type { Client } from 'discord.js'

import type Application from '../../application.js'
import type { InstanceStatus } from '../../common/application-event.js'
import { Instance } from '../../common/instance.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import type MessageAssociation from '../../instance/discord/common/message-association.js'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance.js'

import { ButtonDatabase } from './button-database.js'
import { DiscordHandler } from './discord-handler.js'
import { StatusDatabase } from './status-database.js'

export type MinecraftStatusEntry = InstanceStatus & { instance: MinecraftInstance }

export class MinecraftStatus extends Instance {
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
  }

  public addStatus(status: MinecraftStatusEntry): void {
    this.statusDatabase.add(status)
  }

  public async updateDiscord(
    client: Client,
    association: MessageAssociation,
    channelIds: Set<string>,
    event: MinecraftStatusEntry
  ): Promise<void> {
    await this.discordHandler.send(client, association, channelIds, event)
  }
}
