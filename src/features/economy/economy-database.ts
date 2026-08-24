import assert from 'node:assert'

import type { Database } from 'better-sqlite3'
import type { Logger } from 'log4js'

import type { UserId } from '../../common/application-event.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import type { AnonymousUser } from '../../common/user.js'
import type { Verification } from '../../core/users/verification.js'
import type { Users } from '../../core/users.js'
import Duration from '../../utility/duration.js'

export class EconomyDatabase {
  private static readonly EntriesPerPage = 10
  private static readonly MaxHistory = Duration.years(3)

  public constructor(
    private readonly sqlManager: SqliteManager,
    private readonly users: Users,
    private readonly verification: Verification,
    logger: Logger
  ) {
    this.sqlManager.registerCleaner(() => {
      const database = this.sqlManager.getDatabase()
      const transaction = database.transaction(() => {
        const deleteOldHistory = database.prepare('DELETE FROM "economyHistory" WHERE createdAt < ?')
        return deleteOldHistory.run(Math.floor(Date.now() / 1000) - EconomyDatabase.MaxHistory.toSeconds()).changes
      })

      const result = transaction()
      if (result > 0) logger.debug(`Deleted ${result} old economy history entry`)
    })
  }

  public getValue(user: AnonymousUser): number {
    return this.transaction((context) => context.getAccount(user).total())
  }

  public increaseChat(user: AnonymousUser, amount: number): void {
    const database = this.sqlManager.getDatabase()
    const transaction = database.transaction(() => {
      const userId = this.users.resolveUserId(user.getUserIdentifier())
      const create = database.prepare<[UserId]>('INSERT INTO "economy" (userId) VALUES (?)')
      const getTotalChat = database
        .prepare<[UserId], number>('SELECT totalChat FROM "economy" WHERE userId = ?')
        .pluck(true)
      const getValue = database.prepare<[UserId], number>('SELECT value FROM "economy" WHERE userId = ?').pluck(true)
      const update = database.prepare<[number, number, UserId]>(
        'UPDATE "economy" SET totalChat = ?, value = ? WHERE userId = ?'
      )

      let totalChat = getTotalChat.get(userId)
      if (totalChat === undefined) {
        assert.strictEqual(create.run(userId).changes, 1)
        totalChat = getTotalChat.get(userId)
        assert.ok(totalChat !== undefined)
      }

      const value = getValue.get(userId)
      assert.ok(value !== undefined)

      const result = update.run(totalChat + amount, value + amount, userId)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public tryDecrease(
    user: AnonymousUser,
    amount: number,
    reason: UserEconomyHistoryChange
  ): { newTotal: number; changed: boolean } {
    return this.transaction((context) => {
      const account = context.getAccount(user)
      const total = account.total()
      if (total > amount) {
        account.decrease(amount, reason)
        return { newTotal: account.total(), changed: true }
      } else {
        return { newTotal: total, changed: false }
      }
    })
  }

  /**
   * This function only responsible to execute raw commands.
   * It does NOT check user permissions or care about user intention.
   * It only cares about database integrity.
   *
   * This is SQLITE transaction. Do NOT do modify any data in the database within the transaction,
   * in case the transaction rolls back!
   *
   * @param callback to execute a synchronized commands on the economy database
   * @returns whatever the callback function returns
   * @throws EconomyNotEnough if there is a problem with the economy integrity
   */
  public transaction<T>(callback: (context: EconomyTransaction) => T): T {
    class TransactionCancelled<T> extends Error {
      constructor(public readonly result: T) {
        super()
      }
    }

    const database = this.sqlManager.getDatabase()
    const transaction = database.transaction(() => {
      const context = new EconomyTransaction(database, this.users)

      const result = callback(context)
      if (context.isCancelled() || context.isDestroyed()) {
        throw new TransactionCancelled(result) // to ROLL BACK the transaction
      }

      context.appleChanges()
      context.destroy()

      return result
    })

    try {
      return transaction()
    } catch (error: unknown) {
      if (!(error instanceof TransactionCancelled)) throw error
      return (error as TransactionCancelled<T>).result
    }
  }

  /**
   *
   * @param user the user to get their history
   * @param page 0-indexed
   */
  public userHistory(user: AnonymousUser, page: number): HistoryResult {
    const database = this.sqlManager.getDatabase()
    const transaction = database.transaction(() => {
      const userIds = this.users.resolveAllUserId(user)
      if (userIds.length === 0) return { totalPages: 0, entries: [] }

      let query = 'SELECT * FROM "EconomyHistory" WHERE userId IN '

      query += '(' + userIds.map(() => '?').join(',') + ')'

      const limit = EconomyDatabase.EntriesPerPage
      const offset = page * EconomyDatabase.EntriesPerPage
      query += `LIMIT ${offset},${limit}`

      const queryResult = database.prepare<[...UserId[]], SavedHistory>(query).all(...userIds)
      const count =
        database
          .prepare<[...UserId[]], number>(
            'SELECT COUNT(*) FROM "EconomyHistory" WHERE userId IN ' + '(' + userIds.map(() => '?').join(',') + ')'
          )
          .pluck(true)
          .get(...userIds) ?? 0
      const contents = this.deserialize(queryResult)

      const entries: HistoryResult['entries'] = []
      for (const [index, content] of contents.entries()) {
        entries.push({ content: content, index: page * EconomyDatabase.EntriesPerPage + index })
      }

      return { totalPages: Math.ceil(count / EconomyDatabase.EntriesPerPage), entries: entries }
    })

    return transaction()
  }

  public allHistory(page: number): HistoryResult {
    const database = this.sqlManager.getDatabase()
    const transaction = database.transaction(() => {
      const limit = EconomyDatabase.EntriesPerPage
      const offset = page * EconomyDatabase.EntriesPerPage
      const query = `SELECT * FROM "EconomyHistory" LIMIT ${offset}, ${limit}`
      const queryResult = database.prepare<[], SavedHistory>(query).all()
      const count = database.prepare<[], number>('SELECT COUNT(*) FROM "EconomyHistory"').pluck(true).get() ?? 0
      const contents = this.deserialize(queryResult)

      const entries: HistoryResult['entries'] = []
      for (const [index, content] of contents.entries()) {
        entries.push({ content: content, index: page * EconomyDatabase.EntriesPerPage + index })
      }

      return { totalPages: Math.ceil(count / EconomyDatabase.EntriesPerPage), entries: entries }
    })

    return transaction()
  }

  /**
   * @returns merged accounts into one primary {@link UserId}
   */
  public async getLeaderboard(): Promise<Map<UserId, number>> {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      const allAccounts = database
        .prepare<[], { userId: UserId; value: number }>('SELECT userId, value FROM "economy"')
        .all()

      const mappedAccounts = new Map<UserId, number>()
      for (const account of allAccounts) {
        mappedAccounts.set(account.userId, account.value)
      }

      return mappedAccounts
    })

    const accounts = transaction()
    return await this.verification.linkEntries(accounts, (accounts) => accounts.reduce((a, b) => a + b, 0))
  }

  private deserialize(entries: SavedHistory[]): SavedHistory[] {
    for (const entry of entries) {
      entry.createdAt = entry.createdAt * 1000
    }

    return entries
  }
}

export class EconomyTransaction {
  private readonly definedUserId = new Map<UserId, UserEconomy<AnonymousUser>>()
  private readonly alreadyDefinedUsers = new Map<AnonymousUser, UserEconomy<AnonymousUser>>()

  private destroyed = false
  private cancelled = false

  constructor(
    private readonly database: Database,
    private readonly users: Users
  ) {}

  public getAccount<T extends AnonymousUser>(user: T): UserEconomy<T> {
    this.assertViability()

    const definedAccount = this.alreadyDefinedUsers.get(user)
    if (definedAccount !== undefined) return definedAccount as UserEconomy<T>

    const userIds = this.users.resolveAllUserId(user)
    for (const userId of userIds) {
      assert.strictEqual(this.definedUserId.has(userId), false, `userId ${userId} already defined in another user`)
    }

    const primaryAccount = userIds.at(0)
    assert.ok(primaryAccount !== undefined)

    const getValue = this.database.prepare<[UserId], number>('SELECT value FROM economy WHERE userId = ?').pluck(true)
    const accounts = new Map<UserId, number>()
    for (const userId of userIds) {
      const value = getValue.get(userId) ?? 0
      accounts.set(userId, value)
    }

    const newUserAccountManager = new UserEconomy(this.database, this, user, primaryAccount, accounts)
    for (const userId of userIds) {
      this.definedUserId.set(userId, newUserAccountManager)
    }
    this.alreadyDefinedUsers.set(user, newUserAccountManager)

    return newUserAccountManager
  }

  public appleChanges(): void {
    this.assertViability()

    for (const account of this.definedUserId.values()) {
      account.appleChanges()
    }
  }

  public cancel(): void {
    this.cancelled = true
  }

  public isCancelled(): boolean {
    return this.cancelled
  }

  public destroy(): void {
    this.destroyed = true
  }

  public isDestroyed(): boolean {
    return this.destroyed
  }

  public assertViability(): void {
    assert.ok(!this.destroyed, 'Economy transaction already been ended')
    assert.ok(!this.cancelled, 'Economy transaction already been cancelled')
  }
}

/**
 * Transient class represents a user with all linked accounts
 */
export class UserEconomy<T extends AnonymousUser> {
  private static readonly MaxFunds = Number.MAX_SAFE_INTEGER

  private changes = new Set<UserId>()
  private newHistory: Omit<SavedHistory, 'id' | 'createdAt'>[] = []

  constructor(
    private readonly database: Database,
    private readonly transaction: EconomyTransaction,
    private readonly user: T,
    private primaryAccount: UserId,
    private accounts = new Map<UserId, number>()
  ) {
    this.normalizeNumbers()
  }

  public appleChanges(): number {
    this.transaction.assertViability()

    try {
      let changesCount = 0
      const newAccount = this.database.prepare<[UserId]>('INSERT INTO "economy" (userId) VALUES (?)')
      const setValue = this.database.prepare('UPDATE "economy" SET value = ? WHERE userId = ?')
      const addHistory = this.database.prepare(
        'INSERT INTO "economyHistory" (userId, change, reason, byUser) VALUES (?, ?, ?, ?)'
      )

      for (const userId of this.changes) {
        const newValue = this.accounts.get(userId)
        assert.ok(newValue !== undefined)
        this.assertValue(newValue)
        assert.ok(
          newValue >= 0,
          `new funds value for the user economy "${userId}" must be 0 or greater. Given ${newValue}`
        )

        const result = setValue.run(newValue, userId)
        if (result.changes === 0) {
          const newAccountResult = newAccount.run(userId)
          assert.strictEqual(newAccountResult.changes, 1)
          changesCount++

          const newAccountSetValue = setValue.run(newValue, userId)
          assert.strictEqual(newAccountSetValue.changes, 1)
          changesCount++
        } else {
          assert.strictEqual(result.changes, 1)
          changesCount++
        }
      }

      for (const entry of this.newHistory) {
        const result = addHistory.run(this.primaryAccount, entry.change, entry.reason, entry.byUser)
        assert.strictEqual(result.changes, 1)
        changesCount++
      }

      this.newHistory = []
      this.changes.clear()

      return changesCount
    } catch (error: unknown) {
      if (!(error instanceof EconomyNotEnough)) this.transaction.destroy()
      throw error
    }
  }

  public total(): number {
    this.transaction.assertViability()
    const total = this.accounts.values().reduce((a, b) => a + b, 0)

    if (total > UserEconomy.MaxFunds) {
      this.transaction.destroy()
      assert.fail(`too much funds in account that did not get normalized in advance: ${total}`)
    }

    return total
  }

  /**
   * @throws EconomyNotEnough if not enough funds in the account
   */
  public decrease(value: number, reason: UserEconomyHistoryChange): void {
    this.decreaseUnsafe(value)
    this.tryAddHistory(-value, reason)
  }

  private decreaseUnsafe(value: number): void {
    this.transaction.assertViability()
    assert.ok(value > 0, 'value must be greater than 0')
    this.assertValue(value)

    const total = this.total()
    if (value > total) throw new EconomyNotEnough(this.user, total, value)

    try {
      for (const [userId, accountValue] of this.accounts.entries()) {
        if (value <= 0) break
        if (accountValue <= 0) continue

        const changeValue = Math.min(accountValue, value)
        const newValue = accountValue - changeValue
        value -= changeValue
        this.accounts.set(userId, newValue)
        this.changes.add(userId)
      }

      assert.strictEqual(value, 0)
    } catch (error: unknown) {
      if (!(error instanceof EconomyNotEnough) && !(error instanceof EconomyOverflow)) this.transaction.destroy()
      throw error
    }
  }

  /**
   * @throws EconomyOverflow if too much funds is being added beyond the allowed limit
   */
  public increase(value: number, reason: UserEconomyHistoryChange): void {
    this.increaseUnsafe(value)
    this.tryAddHistory(value, reason)
  }

  /**
   * @throws EconomyOverflow if too much funds is being added beyond the allowed limit
   */
  private increaseUnsafe(value: number): void {
    this.transaction.assertViability()
    assert.ok(value > 0, 'value must be greater than 0')
    this.assertValue(value)

    const currentTotal = this.total()
    if (currentTotal + value > UserEconomy.MaxFunds) {
      throw new EconomyOverflow(this.user, currentTotal, value, UserEconomy.MaxFunds)
    }

    const primaryAccount = this.accounts.get(this.primaryAccount)
    assert.ok(primaryAccount !== undefined)

    let remainingFunds = value
    if (primaryAccount < UserEconomy.MaxFunds) {
      const newAmount = Math.min(primaryAccount + remainingFunds, UserEconomy.MaxFunds)
      this.accounts.set(this.primaryAccount, newAmount)
      this.changes.add(this.primaryAccount)
      const addedFunds = newAmount - primaryAccount
      remainingFunds -= addedFunds
    }

    for (const [account, wallet] of this.accounts.entries()) {
      if (remainingFunds <= 0) break

      const newAmount = Math.min(wallet + remainingFunds, UserEconomy.MaxFunds)
      if (newAmount !== wallet) {
        this.accounts.set(account, newAmount)
        this.changes.add(account)

        const addedFunds = newAmount - wallet
        remainingFunds -= addedFunds
      }
    }

    assert.strictEqual(remainingFunds, 0)
  }

  public set(value: number, reason: UserEconomyHistoryChange): void {
    this.transaction.assertViability()
    assert.ok(value >= 0, 'value must be equal or greater than 0')
    this.assertValue(value)
    if (value > UserEconomy.MaxFunds) throw new EconomyOverflow(this.user, this.total(), value, UserEconomy.MaxFunds)

    try {
      const originalTotal = this.total()
      if (originalTotal === value) {
        this.tryAddHistory(value, reason)
      } else if (originalTotal < value) {
        this.increaseUnsafe(value - originalTotal)
        this.tryAddHistory(value, reason)
      } else if (originalTotal > value) {
        this.decreaseUnsafe(originalTotal - value)
        this.tryAddHistory(value, reason)
      } else {
        assert.fail()
      }
    } catch (error: unknown) {
      if (!(error instanceof EconomyNotEnough) && !(error instanceof EconomyOverflow)) this.transaction.destroy()
      throw error
    }
  }

  private tryAddHistory(amount: number, reason: UserEconomyHistoryChange): void {
    assert.notStrictEqual(reason, undefined)
    this.assertValue(amount)

    this.newHistory.push({
      change: amount,
      userId: this.primaryAccount,
      byUser: 'byUser' in reason ? reason.byUser : undefined,
      reason: reason.reason
    })
  }

  private assertValue(value: number): void {
    assert.strictEqual(Math.floor(value), value, '"value" must be a whole number')
  }

  private normalizeNumbers(): void {
    let total = 0
    for (const [account, wallet] of this.accounts.entries()) {
      const walletNormalized = Math.floor(Math.min(Math.max(wallet, 0), UserEconomy.MaxFunds))
      if (wallet !== walletNormalized) {
        this.accounts.set(account, walletNormalized)
        this.changes.add(account)
      }

      total += walletNormalized
    }

    if (total > UserEconomy.MaxFunds) {
      const factor = UserEconomy.MaxFunds / total

      let newTotal = 0
      for (const [account, wallet] of this.accounts.entries()) {
        const reducedWallet = Math.floor(factor * wallet)
        newTotal += reducedWallet

        this.accounts.set(account, reducedWallet)
        this.changes.add(account)
      }

      // due to Math.floor() and other inaccuracies when working with numbers higher than MAX_SAFE_INTEGER
      if (newTotal < UserEconomy.MaxFunds) {
        const leftOut = UserEconomy.MaxFunds - newTotal
        const largestAccount = this.accounts
          .entries()
          .toArray()
          .toSorted(([, a], [, b]) => b - a)
          .at(0)
        assert.ok(largestAccount !== undefined)

        const [largestAccountId, largestAccountWallet] = largestAccount
        const newAmount = largestAccountWallet + leftOut
        this.accounts.set(largestAccountId, newAmount)
        this.changes.add(largestAccountId)
      }
    }
  }
}

export interface HistoryResult {
  entries: { index: number; content: SavedHistory }[]
  totalPages: number
}

export interface BaseEconomyHistory {
  change: number
  reason: EconomyReason
  createdAt: number
}

export interface SavedHistory extends BaseEconomyHistory {
  id: number | bigint
  userId: UserId
  byUser: UserId | undefined
}

type SoloTypes =
  EconomyReason.RussianRoulette | EconomyReason.DailyReward | EconomyReason.Nuke | EconomyReason.WonSpontaneousEvent
export type UserEconomyHistoryChange =
  { reason: SoloTypes } | { reason: Exclude<EconomyReason, SoloTypes>; byUser: UserId }

export enum EconomyReason {
  SacrificeFrom = 'sacrificeFrom',
  SacrificeTo = 'sacrificeTo',

  UserGive = 'userGive',
  UserTake = 'userTake',
  UserSet = 'userSet',

  Praise = 'praise',
  Insult = 'insult',
  RussianRoulette = 'russianRoulette',
  WonSpontaneousEvent = 'wonSpontaneousEvent',

  AirstrikeTarget = 'airstrikeTarget',
  MuteTarget = 'muteTarget',
  Nuke = 'nuke',

  DailyReward = 'dailyReward'
}

export class EconomyNotEnough<T extends AnonymousUser> extends Error {
  constructor(
    public readonly user: T,
    public readonly current: number,
    public readonly totalChange: number
  ) {
    super()
  }
}

export class EconomyOverflow extends Error {
  constructor(
    public readonly user: AnonymousUser,
    public readonly current: number,
    public readonly totalChange: number,
    public readonly maxAllowed: number
  ) {
    super()
  }
}
