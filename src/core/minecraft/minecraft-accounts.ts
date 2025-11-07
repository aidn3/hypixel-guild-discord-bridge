import type { SqliteManager } from '../../common/sqlite-manager'

export class MinecraftAccounts {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public set(uuid: string, options: GameToggleConfig): void {
    const database = this.sqliteManager.getDatabase()

    const insert = database.prepare('INSERT OR REPLACE INTO "mojangProfileSettings" VALUES (?, ?, ?, ?, ?)')
    insert.run(
      uuid,
      options.playerOnlineStatusEnabled ? 1 : 0,
      options.guildAllEnabled ? 1 : 0,
      options.guildChatEnabled ? 1 : 0,
      options.guildNotificationsEnabled ? 1 : 0
    )
  }

  public get(uuid: string): GameToggleConfig {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT * FROM "mojangProfileSettings" WHERE id = ?')
    const result = select.get(uuid) as Record<keyof GameToggleConfig, number> | undefined

    return {
      playerOnlineStatusEnabled: !!result?.playerOnlineStatusEnabled,
      guildAllEnabled: !!result?.guildAllEnabled,
      guildChatEnabled: !!result?.guildChatEnabled,
      guildNotificationsEnabled: !!result?.guildNotificationsEnabled
    }
  }
}

export interface GameToggleConfig {
  playerOnlineStatusEnabled: boolean

  guildAllEnabled: boolean
  guildChatEnabled: boolean
  guildNotificationsEnabled: boolean
}
