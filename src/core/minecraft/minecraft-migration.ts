import * as crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { Logger } from 'log4js'

import type Application from '../../application'
import type { SqliteManager } from '../../common/sqlite-manager'

import type { MinecraftConfigurations } from './minecraft-configurations'
import type { MinecraftInstanceConfig, SessionsManager } from './sessions-manager'
import { ProxyProtocol } from './sessions-manager'

export function migrateAnyOldMinecraftData(
  application: Application,
  logger: Logger,
  sqliteManager: SqliteManager,
  minecraftConfigurations: MinecraftConfigurations,
  sessionsManager: SessionsManager
): void {
  const database = sqliteManager.getDatabase()
  const transaction = database.transaction(() => {
    const postActions: (() => void)[] = []

    migrateAntispamConfig(application, logger, postActions, minecraftConfigurations)

    const instanceNames = migrateMinecraftConfig(
      application,
      logger,
      postActions,
      minecraftConfigurations,
      sessionsManager
    )
    migrateSessionFiles(application, logger, postActions, sessionsManager, instanceNames)

    return postActions
  })

  const postActions = transaction()
  if (postActions.length > 0) {
    logger.debug('Starting cleaning up...')

    for (const postAction of postActions) {
      postAction()
    }

    logger.debug('Finished migrating Minecraft to database.')
  }
}

function migrateAntispamConfig(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  minecraftConfigurations: MinecraftConfigurations
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
    minecraftConfigurations.setHideLinksViaStuf(oldObject.hideLinksViaStuf)
  }
  if (oldObject.resolveHideLinks !== undefined) {
    minecraftConfigurations.setResolveHideLinks(oldObject.resolveHideLinks)
  }
  if (oldObject.antispamEnabled !== undefined) {
    minecraftConfigurations.setAntispamEnabled(oldObject.antispamEnabled)
  }

  logger.debug('Deleting legacy Minecraft antispam file...')
  postActions.push(() => {
    fs.rmSync(path)
  })
}

function migrateMinecraftConfig(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  minecraftConfigurations: MinecraftConfigurations,
  sessionsManager: SessionsManager
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
    protocol: OldProxyProtocol
  }

  enum OldProxyProtocol {
    Http = 'http',
    Socks5 = 'socks5'
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
    minecraftConfigurations.setAdminUsername(oldObject.adminUsername)
  }

  if (oldObject.announceMutedPlayer !== undefined) {
    minecraftConfigurations.setAnnounceMutedPlayer(oldObject.announceMutedPlayer)
  }
  if (oldObject.joinGuildReaction !== undefined) {
    minecraftConfigurations.setJoinGuildReaction(oldObject.joinGuildReaction)
  }
  if (oldObject.leaveGuildReaction !== undefined) {
    minecraftConfigurations.setLeaveGuildReaction(oldObject.leaveGuildReaction)
  }
  if (oldObject.kickGuildReaction !== undefined) {
    minecraftConfigurations.setKickGuildReaction(oldObject.kickGuildReaction)
  }

  const instanceNames: string[] = []
  if (oldObject.instances !== undefined) {
    for (const instance of oldObject.instances) {
      const newInstance: MinecraftInstanceConfig = { name: instance.name, proxy: undefined }
      if (instance.proxy !== undefined) {
        let protocol: ProxyProtocol
        // noinspection FallThroughInSwitchStatementJS
        switch (instance.proxy.protocol) {
          case OldProxyProtocol.Http: {
            protocol = ProxyProtocol.Http
            break
          }

          default: {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            logger.warn(`Invalid proxy protocol=${instance.proxy.protocol}. Defaulting to socks5.`)
            protocol = ProxyProtocol.Socks5
            break
          }
          case OldProxyProtocol.Socks5: {
            protocol = ProxyProtocol.Socks5
          }
        }
        newInstance.proxy = { id: 0, ...instance.proxy, protocol: protocol }
      }

      sessionsManager.addInstance(newInstance)
      instanceNames.push(newInstance.name)
    }
  }

  logger.info(`Successfully parsed old Minecraft configuration file. `)
  logger.debug('Deleting Minecraft configuration legacy file...')
  postActions.push(() => {
    fs.rmSync(path)
  })

  return instanceNames
}

function migrateSessionFiles(
  application: Application,
  logger: Logger,
  postActions: (() => void)[],
  sessionsManager: SessionsManager,
  instanceNames: string[]
): void {
  const sessionDirectoryName = 'minecraft-sessions'
  const sessionDirectory = application.getConfigFilePath(sessionDirectoryName)
  if (!fs.existsSync(sessionDirectory)) return

  const allFiles = fs.readdirSync(sessionDirectory)
  if (allFiles.length === 0) {
    logger.warn('Legacy Minecraft sessions directory found but empty. Deleting it')
    postActions.push(() => {
      fs.rmSync(sessionDirectory)
    })
    return
  }

  let migratedFiles = 0
  for (const instanceName of new Set<string>(instanceNames).values()) {
    const hash = crypto.createHash('sha1').update(instanceName, 'binary').digest('hex').slice(0, 6)

    for (const sessionFile of allFiles) {
      const regex = /^(\w+)_(\w+)-cache\.json$/g
      const match = regex.exec(instanceName)
      if (match) {
        const regexHash = match[1]
        const regexType = match[2]
        if (regexHash !== hash) continue

        const fullPath = path.resolve(sessionDirectory, sessionFile)
        logger.debug(`Migrating Minecraft session file: ${fullPath}`)
        const sessionData = fs.readFileSync(fullPath, 'utf8')

        sessionsManager.setSession(
          instanceName,
          instanceName,
          regexType,
          JSON.parse(sessionData) as Record<string, unknown>
        )
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
