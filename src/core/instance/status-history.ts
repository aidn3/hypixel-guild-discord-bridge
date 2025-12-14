import assert from 'node:assert'

import type { Logger } from 'log4js'

import type { InstanceIdentifier, InstanceMessage, InstanceStatus } from '../../common/application-event'
import type { Status } from '../../common/connectable-instance'
import type { SqliteManager } from '../../common/sqlite-manager'
import Duration from '../../utility/duration'

export class StatusHistory {
  private static readonly MaxLife = Duration.years(5)
  constructor(
    private readonly sqliteManager: SqliteManager,
    logger: Logger
  ) {
    this.sqliteManager.registerCleaner(() => {
      const database = this.sqliteManager.getDatabase()
      const transaction = database.transaction(() => {
        const currentTime = Math.floor(Date.now() / 1000)

        const deleteStatus = database.prepare('DELETE FROM "instanceStatusHistory" WHERE createdAt < ?')
        const statusCount = deleteStatus.run(currentTime - StatusHistory.MaxLife.toSeconds()).changes

        const deleteMessage = database.prepare('DELETE FROM "instanceMessageHistory" WHERE createdAt < ?')
        const messageCount = deleteMessage.run(currentTime - StatusHistory.MaxLife.toSeconds()).changes

        return [statusCount, messageCount]
      })

      const [statusCount, deleteMessage] = transaction()
      if (statusCount > 0) {
        logger.debug(`Deleted ${statusCount} old entries in instanceStatusHistory.`)
      }
      if (deleteMessage > 0) {
        logger.debug(`Deleted ${deleteMessage} old entries in instanceMessageHistory.`)
      }
    })
  }

  public add(entry: InstanceStatus): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insertStatus = database.prepare(
        'INSERT INTO "instanceStatusHistory" (instanceName, instanceType, createdAt, fromStatus, toStatus) VALUES (?, ?, ?, ?, ?)'
      )
      const insertMessage = database.prepare(
        'INSERT INTO "instanceMessageHistory" (instanceName, instanceType, createdAt, type, value) VALUES (?, ?, ?, ?, ?)'
      )

      let totalChanges = 0
      if (entry.status !== undefined) {
        const result = insertStatus.run(
          entry.instanceName,
          entry.instanceType,
          Math.floor(entry.createdAt / 1000),
          entry.status.from,
          entry.status.to
        )
        assert.strictEqual(result.changes, 1)
        totalChanges += result.changes
      }
      if (entry.message !== undefined) {
        const result = insertMessage.run(
          entry.instanceName,
          entry.instanceType,
          Math.floor(entry.createdAt / 1000),
          entry.message.type,
          entry.message.value
        )
        assert.strictEqual(result.changes, 1)
        totalChanges += result.changes
      }

      assert.ok(totalChanges > 0, `Nothing changed during the insertion?`)
    })

    transaction()
  }

  public getHistory(instanceName: string, fromTimestamp: number, toTimestamp: number): StatusHistoryEntry[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectStatus = database.prepare(
        'SELECT * FROM "instanceStatusHistory" WHERE instanceName = ? AND createdAt >= ? AND createdAt <= ?'
      )
      const selectMessage = database.prepare(
        'SELECT * FROM "instanceMessageHistory" WHERE instanceName = ? AND createdAt >= ? AND createdAt <= ?'
      )

      const statusEntries = selectStatus.all(
        instanceName,
        Math.floor(fromTimestamp / 1000),
        Math.floor(toTimestamp / 1000)
      ) as StatusHistoryChange[]
      const messageEntries = selectMessage.all(
        instanceName,
        Math.floor(fromTimestamp / 1000),
        Math.floor(toTimestamp / 1000)
      ) as StatusHistoryMessage[]

      const entries: StatusHistoryEntry[] = [...statusEntries, ...messageEntries]

      for (const statusEntry of statusEntries) {
        Object.assign(statusEntry, { entryType: StatusHistoryEntryType.Status })
      }
      for (const messageEntry of messageEntries) {
        Object.assign(messageEntry, { entryType: StatusHistoryEntryType.Message })
        const entry: Writeable<StatusHistoryMessage> = messageEntry as Writeable<StatusHistoryMessage>
        entry.value = entry.value ?? undefined // change null to undefined
      }
      for (const entry of entries) {
        // convert from database default seconds to nodejs milliseconds
        entry.createdAt = entry.createdAt * 1000
      }

      return entries.toSorted((a, b) => {
        /* eslint-disable unicorn/prefer-switch, @typescript-eslint/no-unnecessary-condition */
        if (a.createdAt !== b.createdAt) {
          return a.createdAt - b.createdAt
        } else if (a.entryType === b.entryType) {
          return 0
        } else if (a.entryType === StatusHistoryEntryType.Status) {
          return -1
        } else if (a.entryType === StatusHistoryEntryType.Message) {
          return 1
        } else {
          throw new Error(`Unrecognized entry type: ${JSON.stringify(a satisfies never)}`)
        }
        /* eslint-enable unicorn/prefer-switch, @typescript-eslint/no-unnecessary-condition */
      })
    })

    return transaction()
  }
}

export type StatusHistoryEntry = StatusHistoryMessage | StatusHistoryChange

export type StatusHistoryMessage = InstanceMessage & {
  entryType: StatusHistoryEntryType.Message
} & InstanceIdentifier & { createdAt: number }

export type StatusHistoryChange = { fromStatus: Status; toStatus: Status } & {
  entryType: StatusHistoryEntryType.Status
} & InstanceIdentifier & { createdAt: number }

export enum StatusHistoryEntryType {
  Message = 'message',
  Status = 'status'
}
