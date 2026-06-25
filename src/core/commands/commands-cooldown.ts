import assert from 'node:assert'

import type { ChannelType, UserId } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { AnonymousUser } from '../../common/user'
import type { Users } from '../users'

export class CommandsCooldown {
  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly users: Users
  ) {}

  public getGlobalLastExecutionTime(triggers: string[]): number {
    return this.getLastExecutionTime('chatCommandGlobalCooldown', triggers, undefined)
  }

  public resetGlobalLastExecutionTime(triggers: string[]): number {
    return this.resetLastExecutionTime('chatCommandGlobalCooldown', triggers, undefined)
  }

  public updateGlobalLastExecutionTime(triggers: string[]): void {
    this.updateLastExecutionTime('chatCommandGlobalCooldown', triggers, undefined)
  }

  public getChannelLastExecutionTime(
    triggers: string[],
    channelType: ChannelType.Public | ChannelType.Officer
  ): number {
    return this.getLastExecutionTime('chatCommandChannelCooldown', triggers, { key: 'channelType', value: channelType })
  }

  public resetChannelLastExecutionTime(
    triggers: string[],
    channelType: ChannelType.Public | ChannelType.Officer
  ): number {
    return this.resetLastExecutionTime('chatCommandChannelCooldown', triggers, {
      key: 'channelType',
      value: channelType
    })
  }

  public updateChannelLastExecutionTime(
    triggers: string[],
    channelType: ChannelType.Public | ChannelType.Officer
  ): void {
    this.updateLastExecutionTime('chatCommandChannelCooldown', triggers, { key: 'channelType', value: channelType })
  }

  public getUserLastExecutionTime(triggers: string[], user: AnonymousUser): number {
    if (triggers.length === 0) return 0

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      return this.getLastExecutionTime('chatCommandUserCooldown', triggers, { key: 'userId', value: userIds })
    })

    return transaction()
  }

  public resetUserLastExecutionTime(triggers: string[], user: AnonymousUser): number {
    if (triggers.length === 0) return 0

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      return this.resetLastExecutionTime('chatCommandUserCooldown', triggers, { key: 'userId', value: userIds })
    })

    return transaction()
  }

  public updateUserLastExecutionTime(triggers: string[], user: AnonymousUser): void {
    if (triggers.length === 0) return

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      this.updateLastExecutionTime('chatCommandUserCooldown', triggers, { key: 'userId', value: userIds })
    })

    transaction()
  }

  private getLastExecutionTime(
    table: string,
    triggers: string[],
    condition: { key: string; value: string | UserId[] } | undefined
  ): number {
    if (triggers.length === 0) return 0

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const parameters: unknown[] = []
      let query = `SELECT lastExecutedAt FROM "${table}" WHERE`

      query += ` trigger IN (${triggers.map(() => '?').join(', ')})`
      parameters.push(...triggers)

      if (condition !== undefined) {
        if (typeof condition.value === 'string') {
          query += `AND ${condition.key} = ?`
          parameters.push(condition.value)
        } else {
          condition.value satisfies UserId[]
          query += `AND ${condition.key} IN (${condition.value.map(() => '?').join(', ')})`
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
    triggers: string[],
    condition: { key: string; value: string | UserId[] } | undefined
  ): number {
    if (triggers.length === 0) return 0

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const parameters: unknown[] = []
      let query = `DELETE FROM "${table}" WHERE`

      query += ` trigger IN (${triggers.map(() => '?').join(', ')})`
      parameters.push(...triggers)

      if (condition !== undefined) {
        if (typeof condition.value === 'string') {
          query += `AND ${condition.key} = ?`
          parameters.push(condition.value)
        } else {
          condition.value satisfies UserId[]
          query += `AND ${condition.key} IN (${condition.value.map(() => '?').join(', ')})`
          parameters.push(...condition.value)
        }
      }

      return database.prepare(query).run(...parameters).changes
    })

    return transaction()
  }

  private updateLastExecutionTime(
    table: string,
    triggers: string[],
    condition: { key: string; value: string | UserId[] } | undefined
  ): void {
    assert.notStrictEqual(triggers.length, 0)

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const parameters: unknown[] = []
      let keys = `(trigger`
      let values = '(?'
      parameters.push(triggers[0])

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

      this.resetLastExecutionTime(table, triggers, condition)
      const result = database.prepare(`INSERT INTO "${table}" ${keys} VALUES ${values}`).run(...parameters)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }
}
