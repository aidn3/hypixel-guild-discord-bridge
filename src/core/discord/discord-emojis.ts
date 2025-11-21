import type { SqliteManager } from '../../common/sqlite-manager'

export class DiscordEmojis {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public replaceAll(entries: EmojiConfig[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const deleteEntry = database.prepare('DELETE FROM "discordEmojis" WHERE name = ?')
      const insert = database.prepare('INSERT INTO "discordEmojis" (name, hash) VALUES (?, ?)')

      const existingEntries = new Map<string, string>()
      for (const existingEntry of this.getAll()) {
        existingEntries.set(existingEntry.name, existingEntry.hash)
      }
      const toRegisterEntries = new Map<string, string>()
      for (const entry of entries) {
        toRegisterEntries.set(entry.name, entry.hash)
      }

      for (const [toRegisterName, toRegisterHash] of toRegisterEntries) {
        const existingHash = existingEntries.get(toRegisterName)
        if (existingHash === undefined) {
          insert.run(toRegisterName, toRegisterHash)
          continue
        }

        existingEntries.delete(toRegisterName)
        if (toRegisterHash !== existingHash) {
          deleteEntry.run(toRegisterName)
          insert.run(toRegisterName, toRegisterHash)
        }
      }

      for (const existingName of existingEntries.keys()) {
        deleteEntry.run(existingName)
      }
    })

    transaction()
  }

  public getAll(): EmojiConfig[] {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT name, hash FROM "discordEmojis"')

    return select.all() as EmojiConfig[]
  }
}

export interface EmojiConfig {
  name: string
  hash: string
}
