import assert from 'node:assert'

import NodeCache from 'node-cache'

import type { SqliteManager } from '../common/sqlite-manager'
import Duration from '../utility/duration'

export class ConfigurationsManager {
  private static readonly Tablename = 'configurations'
  private readonly createdCategories = new Set<string>()

  constructor(private readonly sqliteManager: SqliteManager) {}

  public create(category: string): Configuration {
    assert.ok(
      !this.createdCategories.has(category),
      'Category is already created and given out. Reuse the object if needed. Objects will not be given again to avoid race conditions.'
    )

    this.createdCategories.add(category)
    return new Configuration(this.sqliteManager, ConfigurationsManager.Tablename, category)
  }
}

export class Configuration {
  private static readonly CacheDuration = Duration.minutes(2)

  private readonly cache = new NodeCache({ stdTTL: Configuration.CacheDuration.toSeconds() })

  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly tablename: string,
    private readonly category: string
  ) {}

  public getStringArray(name: string, defaultValue: string[]): string[] {
    return this.get(name, defaultValue, (raw) => JSON.parse(raw) as string[])
  }

  public setStringArray(name: string, value: string[]) {
    this.set(name, value, (data) => JSON.stringify(data))
  }

  public getString(name: string, defaultValue: string): string {
    return this.get(name, defaultValue)
  }

  public setString(name: string, value: string): void {
    this.set(name, value)
  }

  public getNumber(name: string, defaultValue: number): number {
    return this.get(name, defaultValue, (raw: string | number) =>
      typeof raw === 'number' ? raw : Number.parseInt(raw, 10)
    )
  }

  public setNumber(name: string, value: number): void {
    this.set(name, value)
  }

  public getBoolean(name: string, defaultValue: boolean): boolean {
    return this.get(name, defaultValue, (raw) => raw === '1')
  }

  public setBoolean(name: string, value: boolean): void {
    this.set(name, value, (data) => (data ? '1' : '0'))
  }

  public delete(name: string): boolean {
    this.cache.del(name)

    const statement = this.sqliteManager
      .getDatabase()
      .prepare(`DELETE FROM ${this.tablename} WHERE category = ? AND name = ?`)
    const result = statement.run(this.category, name)
    assert.ok(result.changes >= 0)

    return result.changes !== 0
  }

  private get<T>(name: string, defaultValue: T, deserialize?: (raw: string) => T): T {
    const cached = this.getCachedValue<T>(name)
    if (cached !== undefined) return cached

    const statement = this.sqliteManager
      .getDatabase()
      .prepare(`SELECT value FROM ${this.tablename} WHERE category = ? AND name = ? LIMIT 1`)
    const row = statement.all(this.category, name) as { value: unknown }[]

    let value = defaultValue
    if (row.length > 0) {
      assert.strictEqual(row.length, 1)
      const rawValue = row[0].value

      if (deserialize === undefined) {
        value = rawValue as T
      } else {
        assert.ok(typeof rawValue === 'string')
        value = deserialize(rawValue)
      }
    }

    this.setCachedValue(name, value)
    return value
  }

  private set<T>(name: string, value: T, serialize?: (value: T) => string): void {
    this.setCachedValue(name, value)

    const insert = this.sqliteManager
      .getDatabase()
      .prepare(`INSERT OR REPLACE INTO "${this.tablename}" (category, name, value, lastUpdatedAt) VALUES (?, ?, ?, ?)`)
    const serializedValue = serialize === undefined ? value : serialize(value)
    insert.run(this.category, name, serializedValue, Math.floor(Date.now() / 1000))
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  private getCachedValue<T>(name: string): T | undefined {
    return this.cache.get<T>(name)
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  private setCachedValue<T>(name: string, value: T): void {
    this.cache.set<T>(name, value)
  }
}
