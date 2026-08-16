import assert from 'node:assert'

import type { ChannelType, UserId } from '../../common/application-event.js'
import type { CommandId } from '../../common/commands.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import type { AnonymousUser } from '../../common/user.js'
import type { Users } from '../../core/users.js'

import type { CommandsDatabase } from './commands-database.js'

export class CommandsCooldown {
  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly users: Users,
    private readonly database: CommandsDatabase
  ) {}

  public getGlobalLastExecutionTime(id: CommandId): number {
    return this.getLastExecutionTime('chatCommandGlobalCooldown', id, undefined)
  }

  public resetGlobalLastExecutionTime(id: CommandId): number {
    return this.resetLastExecutionTime('chatCommandGlobalCooldown', id, undefined)
  }

  public updateGlobalLastExecutionTime(id: CommandId): void {
    this.updateLastExecutionTime('chatCommandGlobalCooldown', id, undefined)
  }

  public getChannelLastExecutionTime(id: CommandId, channelType: ChannelType.Public | ChannelType.Officer): number {
    return this.getLastExecutionTime('chatCommandChannelCooldown', id, { key: 'channelType', value: channelType })
  }

  public resetChannelLastExecutionTime(id: CommandId, channelType: ChannelType.Public | ChannelType.Officer): number {
    return this.resetLastExecutionTime('chatCommandChannelCooldown', id, { key: 'channelType', value: channelType })
  }

  public updateChannelLastExecutionTime(id: CommandId, channelType: ChannelType.Public | ChannelType.Officer): void {
    this.updateLastExecutionTime('chatCommandChannelCooldown', id, { key: 'channelType', value: channelType })
  }

  public getUserLastExecutionTime(id: CommandId, user: AnonymousUser): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      return this.getLastExecutionTime('chatCommandUserCooldown', id, { key: 'userId', value: userIds })
    })

    return transaction()
  }

  public resetUserLastExecutionTime(id: CommandId, user: AnonymousUser): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      return this.resetLastExecutionTime('chatCommandUserCooldown', id, { key: 'userId', value: userIds })
    })

    return transaction()
  }

  public updateUserLastExecutionTime(id: CommandId, user: AnonymousUser): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      this.updateLastExecutionTime('chatCommandUserCooldown', id, { key: 'userId', value: userIds })
    })

    transaction()
  }

  private getLastExecutionTime(
    table: string,
    commandId: CommandId,
    condition: { key: string; value: string | UserId[] } | undefined
  ): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      this.database.initAndGet(commandId)

      const parameters: unknown[] = []
      let query = `SELECT lastExecutedAt FROM "${table}" WHERE`

      query += ' commandId = ?'
      parameters.push(commandId)

      if (condition !== undefined) {
        if (typeof condition.value === 'string') {
          query += ` AND ${condition.key} = ?`
          parameters.push(condition.value)
        } else {
          condition.value satisfies UserId[]
          query += ` AND ${condition.key} IN (${condition.value.map(() => '?').join(', ')})`
          parameters.push(...condition.value)
        }
      }

      const result = database
        .prepare<[...unknown[]], number>(query)
        .pluck(true)
        .all(...parameters)
        .map((time) => time * 1000)
      return result.length > 0 ? Math.max(...result) : 0
    })

    return transaction()
  }

  private resetLastExecutionTime(
    table: string,
    commandId: CommandId,
    condition: { key: string; value: string | UserId[] } | undefined
  ): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      this.database.initAndGet(commandId)

      const parameters: unknown[] = []
      let query = `DELETE FROM "${table}" WHERE`

      query += ` commandId = ?`
      parameters.push(commandId)

      if (condition !== undefined) {
        if (typeof condition.value === 'string') {
          query += ` AND ${condition.key} = ?`
          parameters.push(condition.value)
        } else {
          condition.value satisfies UserId[]
          query += ` AND ${condition.key} IN (${condition.value.map(() => '?').join(', ')})`
          parameters.push(...condition.value)
        }
      }

      return database.prepare(query).run(...parameters).changes
    })

    return transaction()
  }

  private updateLastExecutionTime(
    table: string,
    commandId: CommandId,
    condition: { key: string; value: string | UserId[] } | undefined
  ): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      this.database.initAndGet(commandId)

      const parameters: unknown[] = []
      let keys = `(commandId`
      let values = '(?'
      parameters.push(commandId)

      if (condition !== undefined) {
        if (typeof condition.value === 'string') {
          keys += `, ${condition.key}`
          values += `, ?`
          parameters.push(condition.value)
        } else {
          condition.value satisfies UserId[]
          keys += `, ${condition.key}`
          values += `, ?`
          parameters.push(condition.value[0])
        }
      }

      keys += `)`
      values += ')'

      this.resetLastExecutionTime(table, commandId, condition)
      const result = database.prepare(`INSERT INTO "${table}" ${keys} VALUES ${values}`).run(...parameters)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }
}
