import fs from 'node:fs'
import path from 'node:path'

import type { Logger } from 'log4js'

import type Application from '../../application'
import type { SqliteManager } from '../../common/sqlite-manager'

export class MinecraftAccounts {
  constructor(
    private readonly sqliteManager: SqliteManager,
    application: Application,
    logger: Logger
  ) {
    this.migrateAnyOldData(application, logger)
  }

  private migrateAnyOldData(application: Application, logger: Logger): void {
    interface OldGameToggleConfig {
      playerOnlineStatusEnabled: boolean

      guildAllEnabled: boolean
      guildChatEnabled: boolean
      guildNotificationsEnabled: boolean
    }

    const directory = application.getConfigFilePath('minecraft-toggles')
    if (!fs.existsSync(directory)) return

    const allFiles = fs.readdirSync(directory)
    if (allFiles.length === 0) {
      logger.warn('Legacy Minecraft accounts directory found but empty. Deleting it')
      fs.rmdirSync(directory)
      return
    }

    this.sqliteManager.getDatabase().transaction(() => {
      for (const sessionFile of allFiles) {
        const uuid = sessionFile.split('.')[0] // remove .json extension
        const fullPath = path.join(directory, sessionFile)
        logger.debug(`Migrating Minecraft account file: ${fullPath}`)

        const sessionData = fs.readFileSync(fullPath, 'utf8')
        const oldData = JSON.parse(sessionData) as Partial<OldGameToggleConfig>

        const newObject = this.get(uuid)
        newObject.playerOnlineStatusEnabled = oldData.playerOnlineStatusEnabled ?? false
        newObject.guildAllEnabled = oldData.guildChatEnabled ?? false
        newObject.guildChatEnabled = oldData.guildChatEnabled ?? false
        newObject.guildNotificationsEnabled = oldData.guildNotificationsEnabled ?? false
        this.set(uuid, newObject)
      }
    })()

    logger.info(`Migrated ${allFiles.length} Minecraft account file. Deleting the old directory...`)
    fs.rmSync(directory, { recursive: true })
  }

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
