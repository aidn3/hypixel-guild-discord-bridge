import assert from 'node:assert'

import type { SqliteManager } from '../../common/sqlite-manager'
import type { ConditionId } from '../../core/conditions/common'

export class Database {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public initGuild(id: string, name: string, roles: MinecraftGuildRole[]): MinecraftGuild {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      // definitely possible with UPSERT. but I'd rather not since it can get real messy
      const select = database.prepare<[typeof id], MinecraftGuild>('SELECT * FROM minecraftGuild WHERE id = ?')
      const exists = database.prepare('SELECT id FROM minecraftGuild WHERE id = ?')
      const insert = database.prepare('INSERT INTO minecraftGuild (id, name) VALUES (?, ?)')
      const update = database.prepare('UPDATE minecraftGuild SET name = ? WHERE id = ?')

      const insertRole = database.prepare(
        'INSERT INTO minecraftGuildRoles (guildId, name, priority) VALUES (?, ?, ?) ON CONFLICT(guildId, name) DO NOTHING'
      )
      const deleteRoles = database.prepare(
        `DELETE FROM minecraftGuildRoles WHERE guildId = ? AND name NOT IN (${roles.map(() => '?').join(',')})`
      )
      const selectRoles = database.prepare<[typeof id], MinecraftGuildRole>(
        'SELECT name, priority, whitelisted FROM minecraftGuildRoles WHERE guildId = ?'
      )

      if (exists.all(id).length === 0) {
        insert.run(id, name)
      } else {
        assert.strictEqual(update.run(name, id).changes, 1)
      }

      for (const role of roles) {
        insertRole.run(id, role.name, role.priority)
      }
      deleteRoles.run(
        id,
        roles.map((role) => role.name)
      )

      const entry = select.get(id)
      assert.ok(entry !== undefined)
      entry.roles = selectRoles.all(id)
      this.deserializeGuild(entry)
      return entry
    })

    return transaction()
  }

  public allGuilds(): MinecraftGuild[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[], MinecraftGuild>('SELECT * FROM minecraftGuild')
      const selectRoles = database.prepare<[string], MinecraftGuildRole>(
        'SELECT name, priority, whitelisted FROM minecraftGuildRoles WHERE guildId = ?'
      )

      const guilds = select.all()
      for (const guild of guilds) {
        guild.roles = selectRoles.all(guild.id)
        this.deserializeGuild(guild)
      }
      return guilds
    })

    return transaction()
  }

  public deleteGuild(id: string): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const guildExists = database.prepare<[typeof id], number>('SELECT COUNT(*) FROM "minecraftGuild" WHERE id = ?')
      if (guildExists.pluck(true).get(id) === 0) return 0

      const tables = [
        'minecraftGuildMember',
        'minecraftGuildJoinConditions',
        'minecraftGuildRoleConditions',
        'minecraftGuildWaitlist',
        'discordGuildWaitlistPanel',
        'discordGuildWaitlistRequest',
        'minecraftGuildRoles'
      ]

      let count = 0
      for (const table of tables) {
        count += database.prepare(`DELETE FROM "${table}" WHERE guildId = ?`).run(id).changes
      }

      // only delete after counting everything
      count += database.prepare('DELETE FROM "minecraftGuild" WHERE id = ?').run(id).changes

      return count
    })

    return transaction()
  }

  private deserializeGuild(guild: MinecraftGuild): void {
    /* eslint-disable @typescript-eslint/no-unnecessary-type-conversion */
    // noinspection PointlessBooleanExpressionJS
    guild.selfWishlist = !!guild.selfWishlist
    // noinspection PointlessBooleanExpressionJS
    guild.inviteWishlist = !!guild.inviteWishlist
    // noinspection PointlessBooleanExpressionJS
    guild.acceptJoinRequests = !!guild.acceptJoinRequests
    guild.createdAt = guild.createdAt * 1000
    /* eslint-enable @typescript-eslint/no-unnecessary-type-conversion */
  }

  public setWhitelistedGuildRoles(guildId: string, whitelistedRoles: string[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const unWhitelist = database.prepare(
        `UPDATE minecraftGuildRoles SET whitelisted = 0 WHERE guildId = ? AND name NOT IN (${whitelistedRoles.map(() => '?').join(',')})`
      )

      const whitelist = database.prepare(
        `UPDATE minecraftGuildRoles SET whitelisted = 1 WHERE guildId = ? AND name IN (${whitelistedRoles.map(() => '?').join(',')})`
      )

      unWhitelist.run(guildId, ...whitelistedRoles)
      whitelist.run(guildId, ...whitelistedRoles)
    })

    transaction()
  }

  public addWaitlist(guildId: string, mojangId: string): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "minecraftGuildWaitlist" (guildId, mojangId) VALUES (?, ?) ON CONFLICT DO NOTHING'
      )

      return insert.run(guildId, mojangId).changes > 0
    })

    return transaction()
  }

  public removeWaitlist(guildId: string, mojangId: string): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const statementWaitlist = database.prepare(
        'DELETE FROM "minecraftGuildWaitlist" WHERE guildId = ? AND mojangId = ?'
      )

      let changes = 0
      changes += statementWaitlist.run(guildId, mojangId).changes
      return changes > 0
    })

    return transaction()
  }

  public getWaitlistStatus(guildId: string): WaitlistEntry[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectWaitlist = database.prepare<[typeof guildId], WaitlistEntry>(
        'SELECT * FROM minecraftGuildWaitlist WHERE guildId = ?'
      )
      const selectDiscord = database.prepare<[WaitlistRequestEntry['reference']], WaitlistRequestEntry>(
        'SELECT * FROM discordGuildWaitlistRequest WHERE reference = ?'
      )

      const result = selectWaitlist.all(guildId)
      for (const waitlistEntry of result) {
        waitlistEntry.createdAt = waitlistEntry.createdAt * 1000
        waitlistEntry.invitedTill = waitlistEntry.invitedTill * 1000
        waitlistEntry.noInviteTill = waitlistEntry.noInviteTill * 1000

        waitlistEntry.discord = selectDiscord.get(waitlistEntry.id)
        if (waitlistEntry.discord !== undefined) {
          assert.strictEqual(waitlistEntry.id, waitlistEntry.discord.reference)
        }
      }

      result.sort((a, b) => a.createdAt - b.createdAt) // ensure priority

      return result
    })

    return transaction()
  }

  public waitlistSetInvited(id: WaitlistEntry['id'], invitedTill: number): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const changeDate = database.prepare('UPDATE "minecraftGuildWaitlist" SET invitedTill = ? WHERE id = ?')
      return changeDate.run(invitedTill, id).changes > 0
    })

    return transaction()
  }

  public getWaitlistPanels(): WaitlistPanel[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[], WaitlistPanel>('SELECT * FROM discordGuildWaitlistPanel')

      const all = select.all()
      for (const entry of all) {
        entry.createdAt = entry.createdAt * 1000
        entry.lastUpdatedAt = entry.lastUpdatedAt * 1000
      }
      return all
    })

    return transaction()
  }

  public addWaitlistPanel(entry: Omit<WaitlistPanel, 'createdAt' | 'lastUpdatedAt'>): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "discordGuildWaitlistPanel" (messageId, channelId, guildId) VALUES (?, ?, ?)'
      )

      insert.run(entry.messageId, entry.channelId, entry.guildId)
    })

    transaction()
  }

  public getWaitlistByMessageId(messageId: string): WaitlistEntry | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectDiscord = database.prepare<[typeof messageId], WaitlistRequestEntry>(
        'SELECT * FROM discordGuildWaitlistRequest WHERE messageId = ?'
      )
      const selectWaitlist = database.prepare<[WaitlistEntry['id']], WaitlistEntry>(
        'SELECT * FROM minecraftGuildWaitlist WHERE id = ?'
      )

      const discordEntry = selectDiscord.get(messageId)
      if (discordEntry === undefined) return

      const waitlist = selectWaitlist.get(discordEntry.reference)
      assert.ok(waitlist !== undefined)
      assert.strictEqual(discordEntry.reference, waitlist.id)

      waitlist.createdAt = waitlist.createdAt * 1000
      waitlist.invitedTill = waitlist.invitedTill * 1000
      waitlist.noInviteTill = waitlist.noInviteTill * 1000
      waitlist.discord = discordEntry

      return waitlist
    })

    return transaction()
  }

  public getWaitlistByMojangId(mojangId: string): WaitlistEntry | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const selectDiscord = database.prepare<[typeof mojangId], WaitlistRequestEntry>(
        'SELECT * FROM discordGuildWaitlistRequest WHERE mojangId = ?'
      )
      const selectWaitlist = database.prepare<[WaitlistEntry['id']], WaitlistEntry>(
        'SELECT * FROM minecraftGuildWaitlist WHERE id = ?'
      )

      const discordEntry = selectDiscord.get(mojangId)
      if (discordEntry === undefined) return

      const waitlist = selectWaitlist.get(discordEntry.reference)
      assert.ok(waitlist !== undefined)
      assert.strictEqual(discordEntry.reference, waitlist.id)

      waitlist.createdAt = waitlist.createdAt * 1000
      waitlist.invitedTill = waitlist.invitedTill * 1000
      waitlist.noInviteTill = waitlist.noInviteTill * 1000
      waitlist.discord = discordEntry

      return waitlist
    })

    return transaction()
  }

  public rescheduleWaitlist(id: WaitlistEntry['id'], noInviteTill: number): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare<[typeof noInviteTill, typeof id]>(
        'UPDATE "minecraftGuildWaitlist" SET createdAt = (unixepoch()), invitedTill = 0, noInviteTill = ? WHERE id = ?'
      )
      const deleteDiscord = database.prepare<[typeof id]>(
        'DELETE FROM "discordGuildWaitlistRequest" WHERE reference = ?'
      )

      const updateResult = update.run(Math.floor(noInviteTill / 1000), id).changes
      if (updateResult === 0) return false
      assert.strictEqual(updateResult, 1)

      deleteDiscord.run(id)
      return true
    })

    return transaction()
  }

  public addSentWaitlist(entry: WaitlistRequestEntry): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "discordGuildWaitlistRequest" (messageId, channelId, reference) VALUES (?, ?, ?)'
      )

      insert.run(entry.messageId, entry.channelId, entry.reference)
    })

    transaction()
  }

  public deleteMessage(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deletePanel = database.prepare('DELETE FROM "discordGuildWaitlistPanel" WHERE messageId = ?')
      const deleteRequest = database.prepare('DELETE FROM "discordGuildWaitlistRequest" WHERE messageId = ?')

      let count = 0
      for (const messageId of messagesIds) {
        count += deletePanel.run(messageId).changes
        count += deleteRequest.run(messageId).changes
      }

      return count
    })

    return transaction()
  }

  public getSelfWaitlistEnabled(guildId: string): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare('SELECT selfWishlist FROM "minecraftGuild" WHERE id = ?')

      const raw = select.pluck(true).get(guildId) as number | undefined
      return typeof raw === 'number' ? !!raw : false
    })

    return transaction()
  }

  public setSelfWaitlistEnabled(guildId: string, enabled: boolean): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('UPDATE "minecraftGuild" SET selfWishlist = ? WHERE id = ?')

      update.run(enabled ? 1 : 0, guildId)
    })

    transaction()
  }

  public addJoinCondition(condition: GuildJoinCondition): SavedGuildJoinCondition {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "minecraftGuildJoinConditions" (guildId, typeId, options) VALUES (?, ?, ?)'
      )
      const select = database.prepare<[number | bigint], SavedGuildJoinCondition>(
        'SELECT * FROM "minecraftGuildJoinConditions" WHERE id = ?'
      )

      const insertResult = insert.run(condition.guildId, condition.typeId, JSON.stringify(condition.options))
      assert.strictEqual(insertResult.changes, 1)
      const id = insertResult.lastInsertRowid

      const selectResult = select.get(id)
      assert.ok(selectResult !== undefined)

      this.deserializeJoinCondition(selectResult)
      return selectResult
    })

    return transaction()
  }

  public removeJoinCondition(
    guildId: GuildJoinCondition['guildId'],
    conditionId: SavedGuildJoinCondition['id']
  ): SavedGuildJoinCondition | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "minecraftGuildJoinConditions" WHERE id = ? AND guildId = ?')
      const select = database.prepare<[number | bigint, string], SavedGuildJoinCondition>(
        'SELECT * FROM "minecraftGuildJoinConditions" WHERE id = ? AND guildId = ?'
      )

      const condition = select.get(conditionId, guildId)
      if (condition === undefined) return

      this.deserializeJoinCondition(condition)

      assert.strictEqual(deleteEntry.run(conditionId, guildId).changes, 1)
      return condition
    })

    return transaction()
  }

  public getJoinConditions(guildId: GuildJoinCondition['guildId']): SavedGuildJoinCondition[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[typeof guildId], SavedGuildJoinCondition>(
        'SELECT * FROM "minecraftGuildJoinConditions" WHERE guildId = ?'
      )

      const conditions = select.all(guildId)
      for (const condition of conditions) {
        this.deserializeJoinCondition(condition)
      }

      return conditions
    })

    return transaction()
  }

  public getNeededJoinConditions(guildId: string): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare('SELECT neededJoinConditions FROM "minecraftGuild" WHERE id = ?')

      const raw = select.pluck(true).get(guildId) as number | undefined
      return raw ?? 1
    })

    return transaction()
  }

  public setNeededJoinConditions(guildId: string, count: number): void {
    assert.ok(Math.floor(count) === count, `count must be a whole number. given=${count}`)
    assert.ok(count >= 1, `count must be equal or greater than 1. given=${count}`)

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('UPDATE "minecraftGuild" SET neededJoinConditions = ? WHERE id = ?')

      assert.strictEqual(update.run(count, guildId).changes, 1)
    })

    transaction()
  }

  private deserializeJoinCondition(condition: SavedGuildJoinCondition | SavedGuildRoleCondition): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    condition.options = JSON.parse(condition.options as unknown as string)
    condition.createdAt = condition.createdAt * 1000
  }

  public getAcceptJoinRequestsEnabled(guildId: string): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare('SELECT acceptJoinRequests FROM "minecraftGuild" WHERE id = ?')

      const raw = select.pluck(true).get(guildId) as number | undefined
      return typeof raw === 'number' ? !!raw : false
    })

    return transaction()
  }

  public setAcceptJoinRequestsEnabled(guildId: string, enabled: boolean): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('UPDATE "minecraftGuild" SET acceptJoinRequests = ? WHERE id = ?')

      update.run(enabled ? 1 : 0, guildId)
    })

    transaction()
  }

  public addRoleCondition(condition: GuildRoleCondition): SavedGuildRoleCondition {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "minecraftGuildRoleConditions" (guildId, role, typeId, options) VALUES (?, ?, ?, ?)'
      )
      const select = database.prepare<[number | bigint], SavedGuildRoleCondition>(
        'SELECT * FROM "minecraftGuildRoleConditions" WHERE id = ?'
      )

      const insertResult = insert.run(
        condition.guildId,
        condition.role,
        condition.typeId,
        JSON.stringify(condition.options)
      )
      assert.strictEqual(insertResult.changes, 1)
      const id = insertResult.lastInsertRowid

      const selectResult = select.get(id)
      assert.ok(selectResult !== undefined)

      this.deserializeJoinCondition(selectResult)
      return selectResult
    })

    return transaction()
  }

  public removeRoleCondition(
    guildId: GuildRoleCondition['guildId'],
    conditionId: SavedGuildRoleCondition['id']
  ): SavedGuildRoleCondition | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "minecraftGuildRoleConditions" WHERE id = ? AND guildId = ?')
      const select = database.prepare<[number | bigint, string], SavedGuildRoleCondition>(
        'SELECT * FROM "minecraftGuildRoleConditions" WHERE id = ? AND guildId = ?'
      )

      const condition = select.get(conditionId, guildId)
      if (condition === undefined) return

      this.deserializeJoinCondition(condition)

      assert.strictEqual(deleteEntry.run(conditionId, guildId).changes, 1)
      return condition
    })

    return transaction()
  }

  public getRoleConditions(guildId: GuildRoleCondition['guildId']): SavedGuildRoleCondition[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[typeof guildId], SavedGuildRoleCondition>(
        'SELECT * FROM "minecraftGuildRoleConditions" WHERE guildId = ?'
      )

      const conditions = select.all(guildId)
      for (const condition of conditions) {
        this.deserializeJoinCondition(condition)
      }

      return conditions
    })

    return transaction()
  }
}

export type GuildCondition = Pick<ConditionId, 'typeId' | 'options' | 'guildId'>

export type GuildJoinCondition = GuildCondition
export type SavedGuildJoinCondition = GuildJoinCondition & ConditionId

export type GuildRoleCondition = GuildCondition & { role: string }
export type SavedGuildRoleCondition = GuildRoleCondition & ConditionId

export interface MinecraftGuild {
  id: string
  name: string
  /**
   * Non-default additional roles
   */
  roles: MinecraftGuildRole[]
  inviteWishlist: boolean
  selfWishlist: boolean
  neededJoinConditions: number
  acceptJoinRequests: boolean
  createdAt: number
}

export interface MinecraftGuildRole {
  name: string
  priority: number
  whitelisted: boolean
}

export interface WaitlistEntry {
  id: number | bigint
  guildId: string
  mojangId: string

  createdAt: number
  invitedTill: number
  noInviteTill: number

  discord: WaitlistRequestEntry | undefined
}

export interface WaitlistRequestEntry {
  messageId: string
  channelId: string

  reference: WaitlistEntry['id']
}

export interface WaitlistPanel {
  messageId: string
  channelId: string

  guildId: string

  lastUpdatedAt: number
  createdAt: number
}
