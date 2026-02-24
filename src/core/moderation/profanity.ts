import assert from 'node:assert'

import BadWords from 'bad-words'

import type { SqliteManager } from '../../common/sqlite-manager'

import type { ModerationConfigurations } from './moderation-configurations'

export class Profanity {
  private profanityFilter: BadWords.BadWords
  private replacers: { search: RegExp; replaceValue: string }[] = []

  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly config: ModerationConfigurations
  ) {
    this.profanityFilter = new BadWords() // dummy startup object
    this.reloadProfanity()
  }

  private createFilter(): BadWords.BadWords {
    const profanityFilter = new BadWords()
    profanityFilter.removeWords(...this.config.getProfanityWhitelist())
    profanityFilter.addWords(...this.config.getProfanityBlacklist())

    return profanityFilter
  }

  public reloadProfanity(): void {
    const profanityFilter = this.createFilter()

    const replacers = []
    for (const replacer of this.getAllReplacers()) {
      replacers.push({ search: new RegExp(replacer.search, 'gi'), replaceValue: replacer.replace })
    }

    // assign later in case things fail
    this.profanityFilter = profanityFilter
    this.replacers = replacers
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    if (!this.config.getProfanityEnabled())
      return {
        filteredMessage: message,
        changed: false
      }
    assert.ok(this.profanityFilter)

    let filtered: string = message

    for (const replacer of this.replacers) {
      filtered = filtered.replaceAll(replacer.search, replacer.replaceValue)
    }

    try {
      filtered = this.profanityFilter.clean(filtered)
    } catch {
      /*
          profanity package has bug.
          will throw error if given one special character.
          example: clean("?")
          message is clear if thrown
        */
      filtered = message
    }

    return { filteredMessage: filtered, changed: message !== filtered }
  }

  public addReplace(entry: Omit<ProfanityReplace, 'id'>): ProfanityReplace {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare('INSERT INTO "profanityReplace" (search, replace) VALUES (?, ?)')
      const result = insert.run(entry.search, entry.replace)
      return {
        id: result.lastInsertRowid,
        search: entry.search,
        replace: entry.replace
      } satisfies ProfanityReplace
    })

    return transaction()
  }

  public getAllReplacers(): ProfanityReplace[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare<[], ProfanityReplace>('SELECT * FROM "profanityReplace"')
      return insert.all()
    })

    return transaction()
  }

  public removeReplace(id: ProfanityReplace['id']): ProfanityReplace | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[typeof id], ProfanityReplace>('SELECT * FROM "profanityReplace" WHERE id = ?')
      const deleteQuery = database.prepare<[typeof id], ProfanityReplace>('DELETE FROM "profanityReplace" WHERE id = ?')

      const result = select.get(id)
      if (result === undefined) return

      assert.strictEqual(deleteQuery.run(id).changes, 1)
      return result
    })

    return transaction()
  }
}

export interface ProfanityReplace {
  id: number | bigint
  search: string
  replace: string
}
