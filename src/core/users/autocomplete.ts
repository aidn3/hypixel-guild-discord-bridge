import assert from 'node:assert'

import type { Logger } from 'log4js'

import type Application from '../../application'
import { Status } from '../../common/connectable-instance'
import type EventHelper from '../../common/event-helper'
import type { SqliteManager } from '../../common/sqlite-manager'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import Duration from '../../utility/duration'
import { setIntervalAsync } from '../../utility/scheduling'
import type { Core } from '../core'

export default class Autocomplete extends SubInstance<Core, void> {
  private static readonly MaxLife = Duration.years(1)

  constructor(
    application: Application,
    clientInstance: Core,
    eventHelper: EventHelper<Core>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly sqliteManager: SqliteManager,
    abortSignal: AbortSignal
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler, abortSignal)

    application.on('chat', (event) => {
      this.addUsernames([event.user.displayName()])
    })
    application.on('guildPlayer', (event) => {
      if (event.user === undefined) return
      this.addUsernames([event.user.mojangProfile().name])
    })
    application.on('command', (event) => {
      this.addUsernames([event.user.displayName()])
    })
    application.on('commandFeedback', (event) => {
      this.addUsernames([event.user.displayName()])
    })

    setIntervalAsync(async () => this.fetchGuildInfo(), {
      delay: Duration.seconds(60),
      errorHandler: this.errorHandler.promiseCatch('fetching guild info for autocomplete')
    })

    this.sqliteManager.registerCleaner(() => {
      const database = this.sqliteManager.getDatabase()
      database.transaction(() => {
        const oldestTimestamp = Date.now() - Autocomplete.MaxLife.toMilliseconds()
        const cleanUsernames = database.prepare('DELETE FROM "autocompleteUsernames" WHERE timestamp < ?')

        let count = 0
        count += cleanUsernames.run(Math.floor(oldestTimestamp / 1000)).changes
        if (count > 0) this.logger.debug(`Deleted ${count} old autocomplete entry`)
      })()
    })
  }

  public username(query: string, limit: number): string[] {
    return this.fetch('autocompleteUsernames', query, limit)
  }

  private fetch(table: string, query: string, limit: number): string[] {
    assert.ok(limit >= 1, 'limit must be 1 or greater')
    limit = Math.floor(limit)

    query = query.replaceAll(/[%_]/g, '')

    const database = this.sqliteManager.getDatabase()
    return database.transaction(() => {
      const select = database.prepare(`SELECT content FROM "${table}" WHERE content LIKE ? LIMIT ?`)

      const result: string[] = []
      result.push(...(select.pluck(true).all(query + '%', limit) as string[]))

      if (result.length >= limit) {
        assert.strictEqual(result.length, limit)
        return result
      }

      const restSelect = database.prepare(
        `SELECT content FROM "${table}" WHERE content NOT IN (${result.map(() => '?').join(',')}) AND content LIKE ? LIMIT ?`
      )

      result.push(...(restSelect.pluck(true).all(...result, '%' + query + '%', limit - result.length) as string[]))

      assert.ok(result.length <= limit)
      return result
    })()
  }

  private addUsernames(usernames: string[]): void {
    this.add('autocompleteUsernames', usernames)
  }

  private add(table: string, entries: string[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        `INSERT OR REPLACE INTO "${table}" (loweredContent, content, timestamp) VALUES (?, ?, ?)`
      )
      for (const entry of entries) {
        insert.run(entry.toLowerCase().trim(), entry.trim(), Math.floor(Date.now() / 1000))
      }
    })

    transaction()
  }

  private async fetchGuildInfo(): Promise<void> {
    const tasks = []
    const usernames: string[] = []

    for (const instance of this.application.minecraftManager.getAllInstances()) {
      if (instance.currentStatus() !== Status.Connected) continue

      const task = this.application.core.guildManager
        .list(instance, Duration.minutes(1))
        .then((guild) => {
          for (const member of guild.members) {
            usernames.push(member.username)
          }
        })
        .catch(() => undefined)

      tasks.push(task)
    }

    await Promise.all(tasks)

    this.addUsernames(usernames)
  }
}
