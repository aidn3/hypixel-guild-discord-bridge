import type { Logger } from 'log4js'

import type Application from '../application.js'
import type EventHelper from '../common/event-helper.js'
import SubInstance from '../common/sub-instance.js'
import type UnexpectedErrorHandler from '../common/unexpected-error-handler.js'
import Duration from '../utility/duration.js'
import { setIntervalAsync } from '../utility/scheduling.js'

import type { Core } from './core.js'

export class AsyncMigrator extends SubInstance<Core, never> {
  public constructor(
    application: Application,
    clientInstance: Core,
    eventHelper: EventHelper<Core>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler, abortSignal)

    setIntervalAsync(() => Promise.all([this.migrateAdminUsername(), this.migrateImmuneUsernames()]), {
      abortSignal: this.abortSignal,
      errorHandler: this.errorHandler.promiseCatch('async migrating configurations'),
      delay: Duration.seconds(5)
    })
  }

  private async migrateAdminUsername(): Promise<void> {
    const configurations = this.clientInstance.minecraftConfigurations
    const username = configurations.getAdminMojangUuid()
    if (/^\w{2,16}$/.test(username)) {
      this.logger.debug(`Migrating admin mojang username ${username} to UUID...`)
      const mojangProfile = await this.clientInstance.mojangApi.profileByUsername(username)
      this.logger.debug(`Admin mojang username ${mojangProfile.name} will be set to uuid ${mojangProfile.id}`)
      configurations.setAdminMojangUuid(mojangProfile.id)
    }
  }

  private async migrateImmuneUsernames(): Promise<void> {
    const configurations = this.clientInstance.moderationConfiguration
    const usernames = configurations.getImmuneMojangPlayers()

    let changed = false
    for (let index = 0; index < usernames.length; index++) {
      const username = usernames[index]
      if (/^\w{2,16}$/.test(username)) {
        this.logger.debug(`Migrating immune mojang username ${username} to UUID...`)
        const mojangProfile = await this.clientInstance.mojangApi.profileByUsername(username)
        this.logger.debug(`Admin mojang username ${mojangProfile.name} will be set to uuid ${mojangProfile.id}`)
        usernames[index] = mojangProfile.id
        changed = true
      }
    }

    if (changed) configurations.setImmuneMojangPlayers(usernames)
  }
}
