import assert from 'node:assert'

import type { Logger } from 'log4js'

import type { SqliteManager } from '../../common/sqlite-manager'
import Duration from '../../utility/duration'

import type { ApiEntry, ApiEntryWithOption } from './hypixel'
import type { HypixelSuccessResponse } from './hypixel-api'

export class HypixelDatabase {
  private static readonly MaxLife = Duration.years(1)
  private static readonly MaxLastAccess = Duration.months(1)
  private static readonly MaxEntries = 2000

  constructor(
    private readonly sqliteManager: SqliteManager,
    logger: Logger
  ) {
    this.sqliteManager.registerCleaner(() => {
      const database = this.sqliteManager.getDatabase()
      const transaction = database.transaction(() => {
        const currentTime = Math.floor(Date.now() / 1000)

        const deleteOld = database.prepare('DELETE FROM "hypixelApiResponse" WHERE createdAt < ? OR lastAccessAt < ?')
        const deleteOrphan = database.prepare(
          'DELETE FROM hypixelApiResponse WHERE NOT EXISTS (SELECT 1 FROM hypixelApiRequest WHERE hypixelApiRequest.responseId = hypixelApiResponse.id);'
        )
        const deleteExcess = database.prepare(
          'DELETE FROM hypixelApiResponse WHERE id IN (SELECT id FROM hypixelApiResponse ORDER BY lastAccessAt DESC LIMIT -1 OFFSET ?);'
        )

        const oldCount = deleteOld.run(
          currentTime - HypixelDatabase.MaxLife.toSeconds(),
          currentTime - HypixelDatabase.MaxLastAccess.toSeconds()
        ).changes

        const orphanCount = deleteOrphan.run().changes
        const excessCount = deleteExcess.run(HypixelDatabase.MaxEntries).changes
        return { oldCount, orphanCount, excessCount }
      })

      const counts = transaction()
      if (counts.oldCount > 0) {
        logger.debug(`Deleted ${counts.oldCount} old entries in hypixelApiResponse.`)
      }
      if (counts.orphanCount > 0) {
        logger.debug(`Deleted ${counts.orphanCount} orphan entries in hypixelApiResponse.`)
      }
      if (counts.excessCount > 0) {
        logger.debug(`Deleted ${counts.excessCount} excess entries in hypixelApiResponse.`)
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  public retrieve<T extends HypixelSuccessResponse>(
    request: ApiEntry,
    since: number
  ): { content: T; createdAt: number } | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectRequest = database.prepare(
        'SELECT responseId FROM "hypixelApiRequest" WHERE path = ? AND key = ? AND value = ?'
      )
      const selectResponse = database.prepare(
        'SELECT content, createdAt FROM "hypixelApiResponse" WHERE id = ? AND createdAt >= ?'
      )
      const updateLastAccess = database.prepare('UPDATE "hypixelApiResponse" SET lastAccessAt = ? WHERE id = ?')

      const convertedRequest = this.convertIntoSqlite(request)
      const responseId = selectRequest
        .pluck(true)
        .get(convertedRequest.path, convertedRequest.key, convertedRequest.value) as number | undefined
      if (responseId === undefined) return

      const rawResponse = selectResponse.get(responseId, Math.floor(since / 1000)) as
        | { content: string; createdAt: number }
        | undefined
      if (rawResponse === undefined) return

      const updateResult = updateLastAccess.run(Math.floor(Date.now() / 1000), responseId)
      assert.strictEqual(updateResult.changes, 1, 'Failed to update the single valid entry??')

      return { content: JSON.parse(rawResponse.content) as T, createdAt: rawResponse.createdAt * 1000 }
    })

    return transaction()
  }

  public add(requests: ApiEntry[], createdAt: number, data: object): void {
    assert.ok(requests.length > 0, 'Can not insert orphaned Hypixel API data without defining an origin request.')

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insertResponse = database.prepare(
        'INSERT INTO "hypixelApiResponse" (content, createdAt, lastAccessAt) VALUES (?, ?, ?)'
      )
      const insertRequest = database.prepare(
        'INSERT OR REPLACE INTO "hypixelApiRequest" (responseId, path, key, value) VALUES (?, ?, ?, ?)'
      )

      const responseChange = insertResponse.run(
        JSON.stringify(data),
        Math.floor(createdAt / 1000),
        Math.floor(createdAt / 1000)
      )
      assert.strictEqual(responseChange.changes, 1)

      for (const request of requests) {
        const convertedRequest = this.convertIntoSqlite(request)
        insertRequest.run(
          responseChange.lastInsertRowid,
          convertedRequest.path,
          convertedRequest.key,
          convertedRequest.value
        )
      }
    })

    transaction()
  }
  /*
   * SQLITE can have duplicates entries if the column is set to null.
   * Due to this quirk, the value is coerced into something else to mitigate the problem.
   * That way, uniqueness is met. Of course, the solution isn't perfect,
   * but it will meet the current demand and will not conflict in the future.
   * @see https://stackoverflow.com/a/22699498
   * @see
   */
  private convertIntoSqlite(request: ApiEntry): ApiEntryWithOption {
    const DefaultKey = 'default'
    const DefaultValue = 'default'

    return 'key' in request ? request : { path: request.path, key: DefaultKey, value: DefaultValue }
  }
}
