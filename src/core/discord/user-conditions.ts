import assert from 'node:assert'

import type { SqliteManager } from '../../common/sqlite-manager'

export class UserConditions {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public purgeDeletedUsers(guildId: string, userIds: string[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "discordUserUpdate" WHERE guildId = ? AND userId = ?')
      for (const userId of userIds) {
        deleteEntry.run(guildId, userId)
      }
    })

    transaction()
  }

  public purgeGuildId(guildId: string): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "discordUserUpdate" WHERE guildId = ?')
      deleteEntry.run(guildId)
    })

    transaction()
  }

  public userUpdated(guildId: string, userId: string): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT OR REPLACE INTO "discordUserUpdate" (guildId, userId, lastUpdateAt) VALUES (?, ?, ?)'
      )
      insert.run(guildId, userId, Math.floor(Date.now() / 1000))
    })

    transaction()
  }

  public addRoleCondition(guildId: string, condition: RoleCondition): RoleConditionId {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "discordRolesConditions" (guildId, typeId, roleId, options) VALUES (?, ?, ?, ?)'
      )
      const select = database.prepare<[number | bigint], RoleConditionId>(
        'SELECT * FROM "discordRolesConditions" WHERE id = ?'
      )

      const insertResult = insert.run(guildId, condition.typeId, condition.roleId, JSON.stringify(condition.options))
      assert.strictEqual(insertResult.changes, 1)
      const id = insertResult.lastInsertRowid

      const selectResult = select.get(id)
      assert.ok(selectResult !== undefined)

      // deserialize options
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      selectResult.options = JSON.parse(selectResult.options as unknown as string)
      return selectResult
    })

    return transaction()
  }

  public getAllConditions(guildId: string): { roles: RoleConditionId[]; nicknames: NicknameConditionId[] } {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectRoles = database.prepare<[string], RoleConditionId>(
        'SELECT * FROM "discordRolesConditions" WHERE guildId = ?'
      )
      const selectNicknames = database.prepare<[string], NicknameConditionId>(
        'SELECT * FROM "discordNicknameConditions" WHERE guildId = ?'
      )

      const roles = selectRoles.all(guildId)
      const nicknames = selectNicknames.all(guildId)

      // deserialize options
      for (const role of roles) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        role.options = JSON.parse(role.options as unknown as string)
      }
      for (const nickname of nicknames) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nickname.options = JSON.parse(nickname.options as unknown as string)
      }

      return { roles, nicknames }
    })

    return transaction()
  }

  public deleteRoleCondition(guildId: string, conditionId: ConditionId['id']): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "discordRolesConditions" WHERE guildId = ? AND id = ?')
      return deleteEntry.run(guildId, conditionId).changes !== 0
    })

    return transaction()
  }
}

export type ConditionOption = Record<string, string | number | boolean | string[]>

export interface ConditionId {
  id: string
  guildId: string
  createdAt: string
}

export interface RoleCondition {
  typeId: string
  roleId: string
  options: ConditionOption
  onUnmet: OnUnmet
}

export type RoleConditionId = RoleCondition & ConditionId

export interface NicknameCondition {
  typeId: string
  nickname: string
  options: ConditionOption
}

export type NicknameConditionId = NicknameCondition & ConditionId

export enum OnUnmet {
  Remove = 'remove',
  Keep = 'keep'
}
