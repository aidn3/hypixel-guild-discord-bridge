import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { BasePunishment } from '../../common/application-event'
import { ConfigManager } from '../../common/config-manager'
import type { User, UserIdentifier } from '../../common/user'
import Duration from '../../utility/duration'

export interface PunishmentsConfig {
  records: SavedPunishment[]
}

export type SavedPunishment = BasePunishment & UserIdentifier

export default class Punishments {
  private static readonly ConfigName = 'punishments.json'
  private static readonly CheckRemoval = Duration.minutes(30)

  private readonly config: ConfigManager<PunishmentsConfig>

  constructor(
    private readonly application: Application,
    logger: Logger
  ) {
    this.config = new ConfigManager<PunishmentsConfig>(
      application,
      logger,
      application.getConfigFilePath(Punishments.ConfigName),
      {
        records: []
      }
    )

    /*    // migrating old data
        for (const records of Object.values(this.config.data.records)) {
          for (const record of records) {
            // @ts-expect-error it is readonly.
            // noinspection JSConstantReassignment
            record.purpose ??= PunishmentPurpose.Manual
          }
        }*/
  }

  public add(punishment: SavedPunishment): void {
    this.config.data.records.push(punishment)
    this.config.markDirty()
  }

  public remove(user: User): SavedPunishment[] {
    const currentTime = Date.now()
    const result: SavedPunishment[] = []
    const newList: SavedPunishment[] = []

    for (const punishment of this.config.data.records) {
      if (punishment.till < currentTime) continue
      if (user.equalsIdentifier(punishment)) {
        result.push(punishment)
      } else {
        newList.push(punishment)
      }
    }

    if (this.config.data.records.length !== newList.length) {
      this.config.data.records = newList
      this.config.markDirty()
    }

    return result
  }

  findByUser(user: User): SavedPunishment[] {
    const current = Date.now()
    const result: SavedPunishment[] = []
    for (const punishment of this.config.data.records) {
      if (punishment.till < current) continue

      if (!user.equalsIdentifier(punishment)) continue

      result.push(punishment)
    }

    return result
  }

  all(): SavedPunishment[] {
    const current = Date.now()
    const result: SavedPunishment[] = []
    for (const punishment of this.config.data.records) {
      if (punishment.till < current) continue
      result.push(punishment)
    }

    if (this.config.data.records.length !== result.length) {
      this.config.data.records = result
      this.config.markDirty()
    }

    return result
  }
}
