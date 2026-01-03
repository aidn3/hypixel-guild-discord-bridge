import assert from 'node:assert'

import type { Logger } from 'log4js'

import type Application from '../../application'
import { InstanceType } from '../../common/application-event'
import { Status } from '../../common/connectable-instance'
import type EventHelper from '../../common/event-helper'
import type { SqliteManager } from '../../common/sqlite-manager'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import Duration from '../../utility/duration'
import { setIntervalAsync, setTimeoutAsync } from '../../utility/scheduling'
import type { Core } from '../core'

export default class Autocomplete extends SubInstance<Core, InstanceType.Core, void> {
  private static readonly MaxLife = Duration.years(1)

  constructor(
    application: Application,
    clientInstance: Core,
    eventHelper: EventHelper<InstanceType.Core>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly sqliteManager: SqliteManager
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    application.on('chat', (event) => {
      this.addUsernames([event.user.displayName()])
    })
    application.on('guildPlayer', (event) => {
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

    const ranksResolver = setTimeoutAsync(async () => this.resolveGuildRanks(), {
      delay: Duration.seconds(10),
      errorHandler: this.errorHandler.promiseCatch('resolving guild ranks')
    })
    application.on('minecraftSelfBroadcast', (): void => {
      ranksResolver.refresh()
    })
    application.on('instanceAnnouncement', (event): void => {
      if (event.instanceType === InstanceType.Minecraft) {
        ranksResolver.refresh()
      }
    })

    this.sqliteManager.registerCleaner(() => {
      const database = this.sqliteManager.getDatabase()
      database.transaction(() => {
        const oldestTimestamp = Date.now() - Autocomplete.MaxLife.toMilliseconds()
        const cleanUsernames = database.prepare('DELETE FROM "autocompleteUsernames" WHERE timestamp < ?')
        const cleanRanks = database.prepare('DELETE FROM "autocompleteRanks" WHERE timestamp < ?')

        let count = 0
        count += cleanUsernames.run(Math.floor(oldestTimestamp / 1000)).changes
        count += cleanRanks.run(Math.floor(oldestTimestamp / 1000)).changes
        if (count > 0) this.logger.debug(`Deleted ${count} old autocomplete entry`)
      })()
    })
  }

  public username(query: string, limit: number): string[] {
    return this.fetch('autocompleteUsernames', query, limit)
  }

  public rank(query: string, limit: number): string[] {
    return this.fetch('autocompleteRanks', query, limit)
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

  private addRanks(ranks: string[]): void {
    this.add('autocompleteRanks', ranks)
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
    const ranks: string[] = []

    for (const instance of this.application.minecraftManager.getAllInstances()) {
      if (instance.currentStatus() !== Status.Connected) continue

      const task = this.application.core.guildManager
        .list(instance.instanceName, Duration.minutes(1))
        .then((guild) => {
          for (const member of guild.members) {
            usernames.push(member.username)
            ranks.push(member.rank)
          }
        })
        .catch(() => undefined)

      tasks.push(task)
    }

    await Promise.all(tasks)

    this.addUsernames(usernames)
    this.addRanks(ranks)
  }

  private async resolveGuildRanks(): Promise<void> {
    this.logger.debug('Resolving guild ranks from server')

    const guildsResolver = this.application.minecraftManager
      .getMinecraftBots()
      .map((bots) => bots.uuid)
      .map((uuid) => this.application.hypixelApi.getGuildByPlayer(uuid))

    const guilds = await Promise.all(guildsResolver)
    const ranks: string[] = []
    for (const guild of guilds) {
      if (guild === undefined) continue

      for (const rank of guild.ranks) {
        ranks.push(rank.name)
      }
    }

    this.addRanks(ranks)
  }
}
