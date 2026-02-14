import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { Database } from 'better-sqlite3'
import type { Logger, Logger as Logger4Js } from 'log4js'

import type Application from '../application'
import type { SqliteManager } from '../common/sqlite-manager'

const CurrentVersion = 9

export function initializeCoreDatabase(application: Application, sqliteManager: SqliteManager, name: string): void {
  sqliteManager.setTargetVersion(CurrentVersion)

  sqliteManager.registerMigrator(0, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom0to1(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(1, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom1to2(application, database, logger, postCleanupActions, newlyCreated)
  })
  sqliteManager.registerMigrator(2, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom2to3(application, database, logger, postCleanupActions, newlyCreated)
  })
  sqliteManager.registerMigrator(3, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom3to4(application, database, logger, postCleanupActions, newlyCreated)
  })
  sqliteManager.registerMigrator(4, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom4to5(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(5, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom5to6(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(6, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom6to7(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(7, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom7to8(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(8, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom8to9(database, logger, newlyCreated)
  })

  sqliteManager.migrate(name)
}

function migrateFrom0to1(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) {
    const checkedIfFresh = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    const existingTable = checkedIfFresh.pluck(true).get('OnlineMembers')
    if (existingTable) {
      logger.debug('Migrating database from version 0 to 1')

      // Check git commit: 9495ee42a6f50542d18938c85c1de2973f2ed769
      logger.debug('Checking and deleting all poisoned entries in OnlineMembers table if any exists')
      const prepareDeletion = database.prepare('DELETE FROM OnlineMembers')
      const onlineMembersCount = prepareDeletion.run().changes
      logger.debug(`Deleted ${onlineMembersCount} entries in OnlineMembers.`)
      if (onlineMembersCount > 0) {
        logger.warn('OnlineMembers entries have all been deleted')
      }
    }
  }

  // reference: ./users/mojang.ts
  database.exec(
    'CREATE TABLE IF NOT EXISTS "mojang" (' +
      '  uuid TEXT PRIMARY KEY NOT NULL,' +
      '  username TEXT UNIQUE NOT NULL,' +
      '  loweredName TEXT UNIQUE NOT NULL,' + // username all lowercased to use make it easily indexable
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' )'
  )

  // reference: ./users/verification.ts
  database.exec(
    'CREATE TABLE IF NOT EXISTS "links" (' +
      '  uuid TEXT NOT NULL,' +
      '  discordId TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(uuid, discordId)' +
      ' )'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'inferences' (" +
      '  uuid TEXT NOT NULL,' +
      '  discordId TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(uuid, discordId)' +
      ' )'
  )

  // reference: ./users/score-manager.ts
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'DiscordMessages' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'MinecraftMessages' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'DiscordCommands' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'MinecraftCommands' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'AllMembers' (" +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  uuid TEXT NOT NULL,' +
      "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp, 'unixepoch')) STORED, " +
      '  fromTimestamp INTEGER NOT NULL,' +
      "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
      '  toTimestamp INTEGER NOT NULL,' +
      '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
      ' )'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'OnlineMembers' (" +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  uuid TEXT NOT NULL,' +
      "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp ,'unixepoch')) STORED, " +
      '  fromTimestamp INTEGER NOT NULL,' +
      "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
      '  toTimestamp INTEGER NOT NULL,' +
      '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
      ' );'
  )
  database.exec('CREATE INDEX IF NOT EXISTS allMembersAppend ON "AllMembers" (uuid, fromDate, toDate);')
  database.exec('CREATE INDEX IF NOT EXISTS onlineMembersAppend ON "OnlineMembers" (uuid, fromDate, toDate);')

  database.pragma('user_version = 1')
}

function migrateFrom1to2(
  application: Application,
  database: Database,
  logger: Logger4Js,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
): void {
  if (!newlyCreated) logger.debug('Migrating database from version 1 to 2')

  // reference: moderation/punishments.ts
  database.exec(
    'CREATE TABLE "punishments" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  purpose TEXT NOT NULL,' +
      '  reason TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL,' +
      '  till INTEGER NOT NULL' +
      ' )'
  )
  database.exec('CREATE INDEX punishmentsIndex ON "punishments" (originInstance, userId);')

  // reference: moderation/commands-heat.ts
  database.exec(
    'CREATE TABLE "heatsCommands" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL' +
      ' )'
  )
  database.exec(
    'CREATE TABLE "heatsCommandsWarnings" (' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  warnedAt INTEGER NOT NULL,' +
      '  PRIMARY KEY(originInstance, userId, type)' +
      ' )'
  )
  database.exec('CREATE INDEX heatsCommandsIndex ON "heatsCommands" (originInstance, userId);')
  if (!newlyCreated) {
    migrateCommandsHeat(application, logger, postCleanupActions, database)
  }

  // reference: ./users/verification.ts
  database.exec('DROP TABLE "inferences";')

  // reference: ./users/autocomplete.ts
  database.exec(
    "CREATE TABLE 'autocompleteUsernames' (" +
      '  loweredContent TEXT PRIMARY KEY NOT NULL,' + // all lowercased to use make it easily indexable
      '  content TEXT NOT NULL,' +
      '  timestamp INTEGER NOT NULL' +
      ')'
  )
  database.exec(
    "CREATE TABLE 'autocompleteRanks' (" +
      '  loweredContent TEXT PRIMARY KEY NOT NULL,' + // all lowercased to use make it easily indexable
      '  content TEXT NOT NULL,' +
      '  timestamp INTEGER NOT NULL' +
      ')'
  )

  database.pragma('user_version = 2')
}

function migrateFrom2to3(
  application: Application,
  database: Database,
  logger: Logger4Js,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
): void {
  if (!newlyCreated) logger.debug('Migrating database from version 2 to 3')

  // reference: configurations.ts
  database.exec(
    'CREATE TABLE IF NOT EXISTS "configurations" (' +
      '  category TEXT NOT NULL,' +
      '  name TEXT NOT NULL,' +
      '  value TEXT NOT NULL,' +
      '  lastUpdatedAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(category, name)' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateGeneralConfig(application, logger, postCleanupActions, database)
    migrateLanguageConfigurations(application, logger, postCleanupActions, database)
    migrateDiscordConfigurations(application, logger, postCleanupActions, database)
    migrateFeaturesConfig(application, logger, postCleanupActions, database)
    migrateMinecraftAntispamConfig(application, logger, postCleanupActions, database)
    migrateModeration(application, logger, postCleanupActions, database)
    migrateCommandsConfig(application, logger, postCleanupActions, database)
  }

  // reference: minecraft/sessions-manager.ts
  database.exec(
    'CREATE TABLE "mojangSessions" (' +
      '  name TEXT REFERENCES mojangInstances(name) COLLATE NOCASE NOT NULL,' +
      '  cacheName TEXT NOT NULL,' +
      '  value TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL,' +
      '  PRIMARY KEY(name, cacheName)' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "proxies" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  protocol TEXT NOT NULL,' +
      '  host TEXT NOT NULL,' +
      '  port INTEGER NOT NULL,' +
      '  user TEXT DEFAULT NULL,' +
      '  password TEXT DEFAULT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "mojangInstances" (' +
      '  name TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,' +
      '  proxyId INTEGER REFERENCES proxies(id) NULL' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    const instanceNames = migrateMinecraftConfig(application, logger, postCleanupActions, database)
    migrateMinecraftSessionFiles(application, logger, postCleanupActions, database, instanceNames)
  }

  // reference: minecraft/account-settings.ts
  database.exec(
    'CREATE TABLE "mojangProfileSettings" (' +
      '  id TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,' +
      '  playerOnlineStatusEnabled INTEGER NOT NULL DEFAULT 0,' +
      '  guildAllEnabled INTEGER NOT NULL DEFAULT 0,' +
      '  guildChatEnabled INTEGER NOT NULL DEFAULT 0,' +
      '  guildNotificationsEnabled INTEGER NOT NULL DEFAULT 0' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateMinecraftAccountsSettings(application, logger, postCleanupActions, database)
  }

  // reference: discord/discord-leaderboards.ts
  database.exec(
    'CREATE TABLE "discordLeaderboards" (' +
      '  messageId TEXT PRIMARY KEY NOT NULL,' +
      '  type TEXT NOT NULL COLLATE NOCASE,' +
      '  channelId TEXT NOT NULL,' +
      '  guildId TEXT,' +
      '  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateDiscordLeaderboards(application, logger, postCleanupActions, database)
  }

  // reference: discord/discord-temporarily-interactions.ts
  database.exec(
    'CREATE TABLE "discordTempInteractions" (' +
      '  messageId TEXT PRIMARY KEY NOT NULL,' +
      '  channelId TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateDiscordTemporarilyInteractions(application, logger, postCleanupActions, database)
  }

  // reference: discord/discord-emojis.ts
  database.exec(
    'CREATE TABLE "discordEmojis" (' +
      '  name TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,' +
      '  hash TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateDiscordEmojis(application, logger, postCleanupActions, database)
  }

  // reference: users/scores-manager.ts
  database.exec(
    'CREATE TABLE "minecraftBots" (' +
      '  uuid TEXT PRIMARY KEY NOT NULL,' +
      '  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  if (!newlyCreated) {
    migrateScoresManagerConfig(application, logger, postCleanupActions, database)
  }

  database.pragma('user_version = 3')
}

function migrateFrom3to4(
  application: Application,
  database: Database,
  logger: Logger4Js,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
): void {
  if (!newlyCreated) logger.debug('Migrating database from version 3 to 4')

  // reference: minecraft/sessions-manager.ts
  database.exec('ALTER TABLE "mojangInstances" ADD COLUMN "connect" INTEGER NOT NULL DEFAULT 1;')

  // reference: instance/status-history.ts
  database.exec(
    'CREATE TABLE "instanceStatusHistory" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  instanceName TEXT NOT NULL COLLATE NOCASE,' +
      '  instanceType TEXT NOT NULL,' +
      '  fromStatus TEXT NOT NULL,' +
      '  toStatus TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "instanceMessageHistory" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  instanceName TEXT NOT NULL COLLATE NOCASE,' +
      '  instanceType TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  value TEXT DEFAULT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )

  // reference: discord/instance-history-button.ts
  database.exec(
    'CREATE TABLE "discordInstanceHistoryButton" (' +
      '  messageId TEXT NOT NULL,' +
      '  channelId TEXT NOT NULL,' +
      '  instanceName TEXT NOT NULL COLLATE NOCASE,' +
      '  instanceType TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  startTime INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  endTime INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "discordInstanceHistoryLastButton" (' +
      '  messageId TEXT NOT NULL,' +
      '  channelId TEXT NOT NULL,' +
      '  instanceName TEXT NOT NULL COLLATE NOCASE,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(channelId, instanceName)' +
      ' ) STRICT'
  )

  database.pragma('user_version = 4')
}

function migrateFrom4to5(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 4 to 5')

  database.exec('ALTER TABLE "mojangProfileSettings" ADD COLUMN "selectedEnglish" INTEGER NOT NULL DEFAULT 0;')

  database.pragma('user_version = 5')
}

function migrateFrom5to6(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 5 to 6')

  // reference: hypixel/hypixel-database.ts
  database.exec(
    'CREATE TABLE "hypixelApiRequest" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  responseId INTEGER NOT NULL REFERENCES hypixelApiResponse(id) ON DELETE CASCADE,' +
      '  path TEXT NOT NULL,' +
      '  key TEXT NOT NULL,' +
      '  value TEXT NOT NULL,' +
      '  UNIQUE(path, key, value)' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "hypixelApiResponse" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  content TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL,' +
      '  lastAccessAt INTEGER NOT NULL' +
      ' ) STRICT'
  )

  database.pragma('user_version = 6')
}

function migrateFrom6to7(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 6 to 7')

  // reference: discord/roles-configurations.ts
  database.exec(
    'CREATE TABLE "discordUserUpdate" (' +
      '  guildId INTEGER NOT NULL,' +
      '  userId INTEGER NOT NULL,' +
      '  lastUpdateAt INTEGER NOT NULL,' +
      '  PRIMARY KEY(guildId, userId)' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "discordRolesConditions" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  guildId TEXT NOT NULL,' +
      '  typeId TEXT NOT NULL,' +
      '  roleId TEXT NOT NULL,' +
      '  options TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "discordNicknameConditions" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  guildId TEXT NOT NULL,' +
      '  typeId TEXT NOT NULL,' +
      '  nickname TEXT NOT NULL,' +
      '  options TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )

  database.pragma('user_version = 7')
}

function migrateFrom7to8(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 7 to 8')

  // reference: moderation/profanity.ts
  database.exec(
    'CREATE TABLE "profanityReplace" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  search TEXT NOT NULL,' +
      '  replace TEXT NOT NULL' +
      ' ) STRICT'
  )

  database.pragma('user_version = 8')
}

function migrateFrom8to9(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 8 to 9')

  // reference: discord/link-button.ts
  database.exec(
    'CREATE TABLE "discordLinkButton" (' +
      '  messageId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' ) STRICT'
  )

  database.pragma('user_version = 9')
}

function findIdentifier(identifiers: string[]): { originInstance: string; userId: string } | undefined {
  const uuid = identifiers.find((entry) => entry.length === 32)
  if (uuid !== undefined) {
    return { originInstance: 'minecraft', userId: uuid }
  }

  const discordId = identifiers.find((entry) => /^\d+$/.test(entry))
  if (discordId !== undefined) {
    return { originInstance: 'discord', userId: discordId }
  }

  return undefined
}

function setConfiguration(database: Database, category: string, name: string, value: string | number): void {
  const prepared = database.prepare('INSERT INTO "configurations" (category, name, value) VALUES (?, ?, ?)')
  prepared.run(category, name, value)
}

function migrateGeneralConfig(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface GeneralConfig {
    autoRestart: boolean
    originTag: boolean
  }

  const path = application.getConfigFilePath('application.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old general Application configuration file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<GeneralConfig>
  if (oldObject.autoRestart !== undefined) {
    setConfiguration(database, 'general', 'autoRestart', oldObject.autoRestart ? '1' : '0')
  }
  if (oldObject.originTag !== undefined) {
    setConfiguration(database, 'general', 'originTag', oldObject.originTag ? '1' : '0')
  }

  postCleanupActions.push(() => {
    logger.debug('Deleting legacy general Application configuration file...')
    fs.rmSync(path)
  })
}

function migrateFeaturesConfig(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface PluginConfig {
    starfallCultReminder: boolean
    darkAuctionReminder: boolean
  }

  const path = application.getConfigFilePath('features-manager.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Plugins configuration file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<PluginConfig>
  if (oldObject.darkAuctionReminder !== undefined) {
    setConfiguration(database, 'general', 'darkAuctionReminder', oldObject.darkAuctionReminder ? '1' : '0')
  }
  if (oldObject.starfallCultReminder !== undefined) {
    setConfiguration(database, 'general', 'starfallCultReminder', oldObject.starfallCultReminder ? '1' : '0')
  }

  postCleanupActions.push(() => {
    logger.debug('Deleting old Plugins configuration file...')
    fs.rmSync(path)
  })
}

function migrateCommandsConfig(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface CommandsConfig {
    enabled: boolean
    chatPrefix: string
    disabledCommands: string[]
  }

  const path = application.getConfigFilePath('commands.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Chat Commands configuration file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<CommandsConfig>
  if (oldObject.enabled !== undefined) {
    setConfiguration(database, 'commands', 'enabled', oldObject.enabled ? '1' : '0')
  }
  if (oldObject.chatPrefix !== undefined) {
    setConfiguration(database, 'commands', 'chatPrefix', oldObject.chatPrefix)
  }
  if (oldObject.disabledCommands !== undefined) {
    setConfiguration(database, 'commands', 'disabledCommands', JSON.stringify(oldObject.disabledCommands))
  }

  postCleanupActions.push(() => {
    logger.debug('Deleting old Chat Commands configuration file...')
    fs.rmSync(path)
  })
}

function migrateModeration(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface ModerationConfig {
    heatPunishment: boolean
    mutesPerDay: number
    kicksPerDay: number

    immuneDiscordUsers: string[]
    immuneMojangPlayers: string[]

    profanityEnabled: boolean
    profanityWhitelist: string[]
    profanityBlacklist: string[]
  }

  const path = application.getConfigFilePath('moderation.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old moderation file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<ModerationConfig>
  if (oldObject.heatPunishment !== undefined) {
    setConfiguration(database, 'moderation', 'heatPunishment', oldObject.heatPunishment ? '1' : '0')
  }
  if (oldObject.mutesPerDay !== undefined) {
    setConfiguration(database, 'moderation', 'mutesPerDay', oldObject.mutesPerDay.toString(10))
  }
  if (oldObject.kicksPerDay !== undefined) {
    setConfiguration(database, 'moderation', 'kicksPerDay', oldObject.kicksPerDay.toString(10))
  }

  if (oldObject.immuneDiscordUsers !== undefined) {
    setConfiguration(database, 'moderation', 'immuneDiscordUsers', JSON.stringify(oldObject.immuneDiscordUsers))
  }
  if (oldObject.immuneMojangPlayers !== undefined) {
    setConfiguration(database, 'moderation', 'immuneMojangPlayers', JSON.stringify(oldObject.immuneMojangPlayers))
  }

  if (oldObject.profanityEnabled !== undefined) {
    setConfiguration(database, 'moderation', 'profanityEnabled', oldObject.profanityEnabled ? '1' : '0')
  }
  if (oldObject.profanityWhitelist !== undefined) {
    setConfiguration(database, 'moderation', 'profanityWhitelist', JSON.stringify(oldObject.profanityWhitelist))
  }
  if (oldObject.profanityBlacklist !== undefined) {
    setConfiguration(database, 'moderation', 'profanityBlacklist', JSON.stringify(oldObject.profanityBlacklist))
  }

  logger.info(`Successfully parsed old moderation file. Scheduling the old file for deletion...`)
  postCleanupActions.push(() => {
    fs.rmSync(path)
  })
}

function migrateCommandsHeat(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface OldEntry {
    identifiers: string[]
    heatActions: { timestamp: number; type: 'kick' | 'mute' }[]
    lastWarning: Record<'kick' | 'mute', number>
  }

  interface OldType {
    heats?: OldEntry[]
  }

  const path = application.getConfigFilePath('commands-heat.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old commands-heat file. Migrating this file into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as OldType
  oldObject.heats ??= []

  let total = 0
  let addedHeatActions = 0
  const insert = database.prepare(
    'INSERT INTO "heatsCommands" (originInstance, userId, type, createdAt) VALUES (?, ?, ?, ?)'
  )
  for (const entry of oldObject.heats) {
    total += entry.heatActions.length

    const identifier = findIdentifier(entry.identifiers)
    if (identifier == undefined) continue

    for (const heatAction of entry.heatActions) {
      insert.run(identifier.originInstance, identifier.userId, heatAction.type, Math.floor(heatAction.timestamp / 1000))
      addedHeatActions++
    }
  }

  logger.info(`Successfully parsed ${addedHeatActions} legacy commands-heat out of ${total}`)
  postCleanupActions.push(() => {
    fs.rmSync(path)
  })
}

function migrateMinecraftAntispamConfig(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface SanitizerConfig {
    hideLinksViaStuf: boolean
    resolveHideLinks: boolean
    antispamEnabled: boolean
  }

  const path = application.getConfigFilePath('minecraft-antispam.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Minecraft antispam file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<SanitizerConfig>
  if (oldObject.hideLinksViaStuf !== undefined) {
    setConfiguration(database, 'minecraft', 'hideLinksViaStuf', oldObject.hideLinksViaStuf ? '1' : '0')
  }
  if (oldObject.resolveHideLinks !== undefined) {
    setConfiguration(database, 'minecraft', 'resolveHideLinks', oldObject.resolveHideLinks ? '1' : '0')
  }
  if (oldObject.antispamEnabled !== undefined) {
    setConfiguration(database, 'minecraft', 'antispamEnabled', oldObject.antispamEnabled ? '1' : '0')
  }

  postCleanupActions.push(() => {
    logger.debug('Deleting legacy Minecraft antispam file...')
    fs.rmSync(path)
  })
}

function migrateMinecraftConfig(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database
): string[] {
  // legacy types
  interface OldMinecraftInstanceConfig {
    name: string
    proxy: OldProxyConfig | undefined
  }

  interface OldProxyConfig {
    host: string
    port: number
    user: string | undefined
    password: string | undefined
    protocol: 'http' | 'socks5'
  }

  interface OldMinecraftConfig {
    adminUsername: string
    instances: OldMinecraftInstanceConfig[]

    announceMutedPlayer: boolean

    joinGuildReaction: boolean
    leaveGuildReaction: boolean
    kickGuildReaction: boolean
  }

  const path = application.getConfigFilePath('minecraft-manager.json')
  if (!fs.existsSync(path)) return []
  logger.info('Found old Minecraft configuration file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<OldMinecraftConfig>

  if (oldObject.adminUsername !== undefined) {
    setConfiguration(database, 'minecraft', 'adminUsername', oldObject.adminUsername)
  }

  if (oldObject.announceMutedPlayer !== undefined) {
    setConfiguration(database, 'minecraft', 'announceMutedPlayer', oldObject.announceMutedPlayer ? '1' : '0')
  }
  if (oldObject.joinGuildReaction !== undefined) {
    setConfiguration(database, 'minecraft', 'joinGuildReaction', oldObject.joinGuildReaction ? '1' : '0')
  }
  if (oldObject.leaveGuildReaction !== undefined) {
    setConfiguration(database, 'minecraft', 'leaveGuildReaction', oldObject.leaveGuildReaction ? '1' : '0')
  }
  if (oldObject.kickGuildReaction !== undefined) {
    setConfiguration(database, 'minecraft', 'kickGuildReaction', oldObject.kickGuildReaction ? '1' : '0')
  }

  const instanceNames: string[] = []
  if (oldObject.instances !== undefined) {
    const instanceInsert = database.prepare('INSERT INTO "mojangInstances" (name, proxyId) VALUES (?, ?)')
    const proxyInsert = database.prepare(
      'INSERT INTO "proxies" (protocol, host, port, user, password) VALUES (?, ?, ?, ?, ?)'
    )

    for (const instance of oldObject.instances) {
      let proxyId: number | bigint | undefined

      if (instance.proxy !== undefined) {
        proxyId = proxyInsert.run(
          instance.proxy.protocol,
          instance.proxy.host,
          instance.proxy.port,
          instance.proxy.user,
          instance.proxy.password
        ).lastInsertRowid
      }
      instanceInsert.run(instance.name, proxyId)

      instanceNames.push(instance.name)
    }
  }

  logger.info(`Successfully parsed old Minecraft configuration file. `)
  postActions.push(() => {
    logger.debug('Deleting Minecraft configuration legacy file...')
    fs.rmSync(path)
  })

  return instanceNames
}

function migrateDiscordConfigurations(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface DiscordConfig {
    publicChannelIds: string[]
    officerChannelIds: string[]
    helperRoleIds: string[]
    officerRoleIds: string[]

    loggerChannelIds: string[]

    alwaysReplyReaction: boolean
    enforceVerification: boolean
    textToImage: boolean

    guildOnline: boolean
    guildOffline: boolean
  }

  const path = application.getConfigFilePath('discord.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Discord general configurations file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<DiscordConfig>
  if (oldObject.publicChannelIds !== undefined) {
    setConfiguration(database, 'discord', 'publicChannelIds', JSON.stringify(oldObject.publicChannelIds))
  }
  if (oldObject.officerChannelIds !== undefined) {
    setConfiguration(database, 'discord', 'officerChannelIds', JSON.stringify(oldObject.officerChannelIds))
  }
  if (oldObject.helperRoleIds !== undefined) {
    setConfiguration(database, 'discord', 'helperRoleIds', JSON.stringify(oldObject.helperRoleIds))
  }
  if (oldObject.officerRoleIds !== undefined) {
    setConfiguration(database, 'discord', 'officerRoleIds', JSON.stringify(oldObject.officerRoleIds))
  }
  if (oldObject.loggerChannelIds !== undefined) {
    setConfiguration(database, 'discord', 'loggerChannelIds', JSON.stringify(oldObject.loggerChannelIds))
  }

  if (oldObject.alwaysReplyReaction !== undefined) {
    setConfiguration(database, 'discord', 'alwaysReplyReaction', oldObject.alwaysReplyReaction ? '1' : '0')
  }
  if (oldObject.enforceVerification !== undefined) {
    setConfiguration(database, 'discord', 'enforceVerification', oldObject.enforceVerification ? '1' : '0')
  }
  if (oldObject.textToImage !== undefined) {
    setConfiguration(database, 'discord', 'textToImage', oldObject.textToImage ? '1' : '0')
  }

  if (oldObject.guildOnline !== undefined) {
    setConfiguration(database, 'discord', 'guildOnline', oldObject.guildOnline ? '1' : '0')
  }
  if (oldObject.guildOffline !== undefined) {
    setConfiguration(database, 'discord', 'guildOffline', oldObject.guildOffline ? '1' : '0')
  }

  logger.info(`Successfully parsed old Discord general configurations file.`)
  postCleanupActions.push(() => {
    logger.debug('Deleting old Discord general configurations file...')
    fs.rmSync(path)
  })
}

function migrateDiscordLeaderboards(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database
): void {
  // legacy types
  interface OldLeaderboardConfig {
    messages30Days: OldLeaderboardEntry[]
    online30Days: OldLeaderboardEntry[]
    points30Days: OldLeaderboardEntry[]
  }

  interface OldLeaderboardEntry {
    lastUpdate: number
    channelId: string
    messageId: string
    guildId: string | undefined
  }

  const path = application.getConfigFilePath('discord-leaderboards.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Discord leaderboard file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<OldLeaderboardConfig>

  const insert = database.prepare(
    'INSERT OR REPLACE INTO "discordLeaderboards" (messageId, type,channelId, guildId) VALUES (?, ?, ?, ?)'
  )

  let count = 0
  if (oldObject.messages30Days !== undefined) {
    for (const entry of oldObject.messages30Days) {
      count++
      insert.run(entry.messageId, 'messages30Days', entry.channelId, entry.guildId)
    }
  }
  if (oldObject.online30Days !== undefined) {
    for (const entry of oldObject.online30Days) {
      count++
      insert.run(entry.messageId, 'online30Days', entry.channelId, entry.guildId)
    }
  }
  if (oldObject.points30Days !== undefined) {
    for (const entry of oldObject.points30Days) {
      count++
      insert.run(entry.messageId, 'points30Days', entry.channelId, entry.guildId)
    }
  }

  logger.info(`Successfully parsed ${count++} Discord leaderboards from the legacy file.`)
  postActions.push(() => {
    logger.debug('Deleting old Discord leaderboards file...')
    fs.rmSync(path)
  })
}

function migrateDiscordTemporarilyInteractions(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database
): void {
  // legacy types
  interface MessageDeleterConfig {
    expireSeconds: number
    maxInteractions: number
    interactions: OldDiscordMessage[]
  }

  interface OldDiscordMessage {
    createdAt: number
    messages: { channelId: string; messageId: string }[]
  }

  const path = application.getConfigFilePath('discord-temp-events.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Discord temporarily interactions file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<MessageDeleterConfig>

  if (oldObject.expireSeconds !== undefined) {
    setConfiguration(database, 'discord', 'temporarilyInteractionsDuration', oldObject.expireSeconds)
  }
  if (oldObject.maxInteractions !== undefined) {
    setConfiguration(database, 'discord', 'temporarilyInteractionsCount', oldObject.maxInteractions)
  }

  if (oldObject.interactions !== undefined) {
    const insert = database.prepare(
      'INSERT OR REPLACE INTO "discordTempInteractions" (messageId, channelId, createdAt) VALUES (?, ?, ?)'
    )

    for (const interaction of oldObject.interactions) {
      for (const message of interaction.messages) {
        insert.run(message.messageId, message.channelId, Math.floor(interaction.createdAt / 1000))
      }
    }
  }

  logger.info(`Successfully parsed Discord temporarily interactions from the legacy file.`)
  postActions.push(() => {
    logger.debug('Deleting old Discord temporarily interactions file...')
    fs.rmSync(path)
  })
}

function migrateDiscordEmojis(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database
): void {
  // legacy types
  interface EmojiConfig {
    savedEmojis: { name: string; hash: string }[]
  }

  const path = application.getConfigFilePath('discord-registered-emoji.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Discord Emojis file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<EmojiConfig>

  if (oldObject.savedEmojis !== undefined) {
    const insert = database.prepare('INSERT OR REPLACE INTO "discordEmojis" (name, hash) VALUES (?, ?)')

    for (const savedEmoji of oldObject.savedEmojis) {
      insert.run(savedEmoji.name, savedEmoji.hash)
    }
  }

  logger.info(`Successfully parsed ${oldObject.savedEmojis?.length ?? 0} Discord Emojis from the legacy file.`)
  postActions.push(() => {
    logger.debug('Deleting old Discord Emojis file...')
    fs.rmSync(path)
  })
}

function migrateMinecraftSessionFiles(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database,
  instanceNames: string[]
): void {
  const sessionDirectoryName = 'minecraft-sessions'
  const sessionDirectory = application.getConfigFilePath(sessionDirectoryName)
  if (!fs.existsSync(sessionDirectory)) return

  const allFiles = fs.readdirSync(sessionDirectory)
  if (allFiles.length === 0) {
    logger.warn('Legacy Minecraft sessions directory found but empty. Deleting it')
    postActions.push(() => {
      fs.rmdirSync(sessionDirectory)
    })
    return
  }

  let migratedFiles = 0
  const statement = database.prepare(
    'INSERT OR REPLACE INTO "mojangSessions" (name, cacheName, value, createdAt) VALUES (?, ?, ?, ?)'
  )
  for (const instanceName of new Set<string>(instanceNames).values()) {
    const hash = crypto.createHash('sha1').update(instanceName, 'binary').digest('hex').slice(0, 6)

    for (const sessionFile of allFiles) {
      const regex = /^(\w+)_(\w+)-cache\.json$/g
      const match = regex.exec(sessionFile)
      if (match) {
        const regexHash = match[1]
        const regexType = match[2]
        if (regexHash !== hash) continue

        const fullPath = path.join(sessionDirectory, sessionFile)
        logger.debug(`Migrating Minecraft session file: ${fullPath}`)
        const sessionData = fs.readFileSync(fullPath, 'utf8')

        statement.run(instanceName, regexType, JSON.stringify(JSON.parse(sessionData)), Math.floor(Date.now() / 1000))
        migratedFiles++
      }
    }
  }

  const message = `Migrated ${migratedFiles} Minecraft session file out of ${allFiles.length}.`

  if (migratedFiles === allFiles.length) {
    logger.info(message)
  } else {
    logger.warn(message)
    logger.warn('Other Minecraft session files will be permanently deleted.')
  }

  postActions.push(() => {
    fs.rmSync(sessionDirectory, { recursive: true })
  })
}

function migrateMinecraftAccountsSettings(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  database: Database
): void {
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

  const insert = database.prepare('INSERT OR REPLACE INTO "mojangProfileSettings" VALUES (?, ?, ?, ?, ?)')
  for (const sessionFile of allFiles) {
    const uuid = sessionFile.split('.')[0] // remove .json extension
    const fullPath = path.join(directory, sessionFile)
    logger.debug(`Migrating Minecraft account file: ${fullPath}`)

    const sessionData = fs.readFileSync(fullPath, 'utf8')
    const oldData = JSON.parse(sessionData) as Partial<OldGameToggleConfig>

    insert.run(
      uuid,
      oldData.playerOnlineStatusEnabled ? 1 : 0,
      oldData.guildAllEnabled ? 1 : 0,
      oldData.guildChatEnabled ? 1 : 0,
      oldData.guildNotificationsEnabled ? 1 : 0
    )
  }

  logger.info(`Migrated ${allFiles.length} Minecraft account file. Deleting the old directory...`)
  postActions.push(() => {
    fs.rmSync(directory, { recursive: true })
  })
}

function migrateScoresManagerConfig(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface ScoreManagerConfig {
    minecraftBotUuids: string[]
  }

  const path = application.getConfigFilePath('scores-manager.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old Scores configuration file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<ScoreManagerConfig>
  if (oldObject.minecraftBotUuids !== undefined) {
    const insert = database.prepare(
      'INSERT INTO "minecraftBots" (uuid) VALUES (?) ON CONFLICT(uuid) DO UPDATE SET updatedAt = (unixepoch())'
    )
    for (const minecraftBotUuid of oldObject.minecraftBotUuids) {
      insert.run(minecraftBotUuid)
    }
  }

  postCleanupActions.push(() => {
    logger.debug('Deleting legacy Scores configuration file...')
    fs.rmSync(path)
  })
}

function migrateLanguageConfigurations(
  application: Application,
  logger: Logger,
  postCleanupActions: (() => void)[],
  database: Database
): void {
  interface LanguageConfig {
    language: string
    darkAuctionReminder: string
    starfallReminder: string

    commandMuteGame: string[]

    commandRouletteWin: string[]
    commandRouletteLose: string[]

    commandVengeanceWin: string[]
    commandVengeanceDraw: string[]
    commandVengeanceLose: string[]

    announceMutedPlayer: string

    guildJoinReaction: string[]
    guildLeaveReaction: string[]
    guildKickReaction: string[]
  }

  const path = application.getConfigFilePath('language.json')
  if (!fs.existsSync(path)) return
  logger.info('Found old language configurations file. Migrating it into the new system...')

  const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<LanguageConfig>
  if (oldObject.language !== undefined) {
    setConfiguration(database, 'language', 'language', oldObject.language)
  }
  if (oldObject.darkAuctionReminder !== undefined) {
    setConfiguration(database, 'language', 'darkAuctionReminder', oldObject.darkAuctionReminder)
  }
  if (oldObject.starfallReminder !== undefined) {
    setConfiguration(database, 'language', 'starfallReminder', oldObject.starfallReminder)
  }

  if (oldObject.commandMuteGame !== undefined) {
    setConfiguration(database, 'language', 'commandMuteGame', JSON.stringify(oldObject.commandMuteGame))
  }
  if (oldObject.commandRouletteWin !== undefined) {
    setConfiguration(database, 'language', 'commandRouletteWin', JSON.stringify(oldObject.commandRouletteWin))
  }
  if (oldObject.commandRouletteLose !== undefined) {
    setConfiguration(database, 'language', 'commandRouletteLose', JSON.stringify(oldObject.commandRouletteLose))
  }

  if (oldObject.commandVengeanceWin !== undefined) {
    setConfiguration(database, 'language', 'commandVengeanceWin', JSON.stringify(oldObject.commandVengeanceWin))
  }
  if (oldObject.commandVengeanceDraw !== undefined) {
    setConfiguration(database, 'language', 'commandVengeanceDraw', JSON.stringify(oldObject.commandVengeanceDraw))
  }
  if (oldObject.commandVengeanceLose !== undefined) {
    setConfiguration(database, 'language', 'commandVengeanceLose', JSON.stringify(oldObject.commandVengeanceLose))
  }

  if (oldObject.announceMutedPlayer !== undefined) {
    setConfiguration(database, 'language', 'announceMutedPlayer', oldObject.announceMutedPlayer)
  }

  if (oldObject.guildJoinReaction !== undefined) {
    setConfiguration(database, 'language', 'guildJoinReaction', JSON.stringify(oldObject.guildJoinReaction))
  }
  if (oldObject.guildLeaveReaction !== undefined) {
    setConfiguration(database, 'language', 'guildLeaveReaction', JSON.stringify(oldObject.guildLeaveReaction))
  }
  if (oldObject.guildKickReaction !== undefined) {
    setConfiguration(database, 'language', 'guildKickReaction', JSON.stringify(oldObject.guildKickReaction))
  }

  logger.info(`Successfully parsed old language configurations file.`)
  postCleanupActions.push(() => {
    logger.debug('Deleting old language configurations file...')
    fs.rmSync(path)
  })
}
