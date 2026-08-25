import { DiscordAPIError } from 'discord.js'
import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import Duration from '../../utility/duration.js'
import { setIntervalAsync } from '../../utility/scheduling.js'

import type { ButtonDatabase, DiscordPersistentInstance } from './button-database.js'
import type { MinecraftActionButtons } from './minecraft-action-buttons.js'

export class DeleteExpiredActions extends SubInstance<MinecraftActionButtons, void> {
  private readonly singleton = new PromiseQueue(1)

  constructor(
    application: Application,
    instance: MinecraftActionButtons,
    eventHelper: EventHelper<MinecraftActionButtons>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal,
    private readonly database: ButtonDatabase
  ) {
    super(application, instance, eventHelper, logger, errorHandler, abortSignal)

    setIntervalAsync(() => this.singleton.add(() => this.clean()), {
      delay: Duration.minutes(1),
      errorHandler: this.errorHandler.promiseCatch('Deleting expired actions'),
      abortSignal: this.abortSignal
    })
  }

  private async clean(): Promise<void> {
    const entries = this.database.getExpiredButtons()
    const tasks: Promise<void>[] = []
    for (const entry of entries) {
      const task = this.disableAndDeleteEntry(entry).catch(
        this.errorHandler.promiseCatch(`Deleting expired action. type=${entry.type}, botUuid=${entry.botUuid}`)
      )
      tasks.push(task)
    }

    await Promise.allSettled(tasks)
  }

  private async disableAndDeleteEntry(entry: DiscordPersistentInstance): Promise<void> {
    try {
      const client = this.application.discordInstance.getClient()
      const channel = await client.channels.fetch(entry.channelId)
      if (!channel) {
        this.logger.warn(`can not access channel ${entry.channelId}. Deleting all related entries from the database...`)
        this.database.removeChannels([entry.channelId])
        return
      }

      if (!channel.isSendable()) {
        this.logger.warn(
          `can not send messages in channel ${entry.channelId}. Deleting all related entries from the database...`
        )
        this.database.removeChannels([entry.channelId])
        return
      }

      await channel.messages.edit(entry.messageId, {
        components: [this.clientInstance.generateButtons(entry.type, false)]
      })
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError) {
        switch (error.status) {
          case 10_003: {
            this.logger.warn(`Channel ${entry.channelId} has been deleted. deleting all related saved entries...`)
            this.database.removeChannels([entry.channelId])
            break
          }
          case 10_008: {
            this.logger.debug(`Message ${entry.messageId} has been deleted. skipping deletion...`)
            this.database.removeMessages([entry.messageId])
            break
          }
          case 50_001: {
            this.logger.debug(`Message ${entry.messageId} can not be accessed. skipping deletion...`)
            this.database.removeMessages([entry.messageId])
            break
          }
          // No default
        }
      }
    } finally {
      this.database.removeMessages([entry.messageId])
    }
  }
}
