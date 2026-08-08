import assert from 'node:assert'

import type { CommandId } from '../../common/commands'
import { ChatCommandGroup } from '../../common/commands'
import type { SqliteManager } from '../../common/sqlite-manager'

export interface ChatCommandStatus {
  id: CommandId
  enabled: boolean
}

export interface SavedCommandGroup {
  group: ChatCommandGroup
  prefix: string
}

export class CommandsDatabase {
  constructor(private readonly sqliteManager: SqliteManager) {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const registeredGroups = new Set(
        database.prepare<[], string>('SELECT "group" FROM chatCommandGroups').pluck(true).all()
      )
      const officialGroups = new Set(Object.values(ChatCommandGroup))

      const unregisteredGroups = officialGroups.difference(registeredGroups)
      assert.strictEqual(
        unregisteredGroups.size,
        0,
        `chat commands group(s) not registered in the database?` +
          ` expected=${officialGroups.values().toArray().join('/')},` +
          ` actual=${registeredGroups.values().toArray().join('/')}`
      )

      const excessGroups = registeredGroups.difference(officialGroups)
      assert.strictEqual(
        excessGroups.size,
        0,
        `chat commands group(s) registered but not actually needed or used anywhere:` +
          ` expected=${officialGroups.values().toArray().join('/')},` +
          ` actual=${registeredGroups.values().toArray().join('/')}`
      )
    })
    transaction()
  }

  public commandGroups(group: ChatCommandGroup): SavedCommandGroup {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[ChatCommandGroup], SavedCommandGroup>(
        'SELECT * FROM chatCommandGroups WHERE "group" = ?'
      )
      const result = select.get(group)
      assert.ok(result !== undefined)
      return result
    })

    return transaction()
  }

  public setPrefix(group: ChatCommandGroup, prefix: string): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare<[string, ChatCommandGroup]>(
        'UPDATE chatCommandGroups SET prefix = ? WHERE "group" = ?'
      )
      const result = update.run(prefix, group)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public initAndGet(id: CommandId): ChatCommandStatus {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[CommandId], ChatCommandStatus>('SELECT * FROM chatCommands WHERE id = ?')
      const result = select.get(id)
      if (result !== undefined) return this.deserialize(result)

      const insert = database.prepare<[CommandId]>('INSERT INTO chatCommands (id) VALUES (?)')
      const insertResult = insert.run(id)
      assert.strictEqual(insertResult.changes, 1)

      const finalResult = select.get(id)
      assert.ok(finalResult !== undefined)
      return this.deserialize(finalResult)
    })

    return transaction()
  }

  public toggleCommandEnabled(id: CommandId): boolean {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const newStatus = !this.initAndGet(id).enabled

      const update = database.prepare<[number, CommandId]>('UPDATE chatCommands SET enabled = ? WHERE id = ?')
      const result = update.run(newStatus ? 1 : 0, id)
      assert.strictEqual(result.changes, 1)

      return newStatus
    })

    return transaction()
  }

  public allCommands(): ChatCommandStatus[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const select = database.prepare<[], ChatCommandStatus>('SELECT * FROM chatCommands')

      const result = select.all()
      for (const entry of result) this.deserialize(entry)
      return result
    })

    return transaction()
  }

  private deserialize(entry: ChatCommandStatus): ChatCommandStatus {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
    entry.enabled = !!entry.enabled
    return entry
  }
}
