import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { InstanceType, UserIdentifier } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import EventHandler from '../../common/event-handler.js'
import type EventHelper from '../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import type ModerationInstance from './moderation-instance.js'
import type { ModerationConfig } from './moderation-instance.js'
import { matchIdentifiersLists, matchUserIdentifier, userIdentifiersToList } from './util.js'

export class CommandsHeat extends EventHandler<ModerationInstance, InstanceType.Moderation, void> {
  private static readonly ActionExpiresAfter: number = 24 * 60 * 60 * 10
  private static readonly WarnPercentage = 0.8
  private static readonly WarnEvery = 30 * 60 * 1000

  private readonly heats
  private readonly config

  constructor(
    application: Application,
    clientInstance: ModerationInstance,
    config: ConfigManager<ModerationConfig>,
    eventHelper: EventHelper<InstanceType.Moderation>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.config = config
    this.heats = new ConfigManager<HeatUser[]>(
      application,
      logger,
      application.getConfigFilePath('commands-heat.json'),
      []
    )
  }

  public status(identifiers: UserIdentifier, type: HeatType): HeatResult {
    if (this.immune(identifiers)) return HeatResult.Allowed

    const user = this.resolveUser(identifiers)
    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length

    if (count >= typeInfo.maxLimit) return HeatResult.Denied
    if (count >= typeInfo.warnLimit) return HeatResult.Warn
    return HeatResult.Allowed
  }

  public add(identifier: UserIdentifier, type: HeatType): HeatResult {
    const user = this.resolveUser(identifier)
    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length
    user.heatActions.push({ timestamp: Date.now(), type: type })
    this.addUser(user)

    if (this.immune(identifier)) return HeatResult.Allowed

    if (count >= typeInfo.maxLimit) return HeatResult.Denied

    const currentTimestamp = Date.now()
    // 1+ added to help with low warnLimit
    if (count + 1 >= typeInfo.warnLimit && (user.lastWarning.get(type) ?? 0) + typeInfo.warnEvery < currentTimestamp) {
      user.lastWarning.set(type, currentTimestamp)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  public tryAdd(identifier: UserIdentifier, type: HeatType): HeatResult {
    const user = this.resolveUser(identifier)

    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length
    user.heatActions.push({ timestamp: Date.now(), type: type })

    if (this.immune(identifier)) {
      this.addUser(user)
      return HeatResult.Allowed
    }

    if (count >= typeInfo.maxLimit) return HeatResult.Denied

    this.addUser(user)
    const currentTimestamp = Date.now()
    // 1+ added to help with low warnLimit
    if (count + 1 >= typeInfo.warnLimit && (user.lastWarning.get(type) ?? 0) + typeInfo.warnEvery < currentTimestamp) {
      user.lastWarning.set(type, currentTimestamp)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  private immune(identifier: UserIdentifier): boolean {
    if (identifier.userUuid !== undefined && this.clientInstance.immuneMinecraft(identifier.userName)) {
      return true
    } else if (identifier.userDiscordId !== undefined && this.clientInstance.immuneDiscord(identifier.userDiscordId)) {
      return true
    }

    return false
  }

  private addUser(heatUser: HeatUser): void {
    this.heats.data = this.heats.data.filter((user) => !matchIdentifiersLists(heatUser.identifiers, user.identifiers))
    this.heats.data.push(heatUser)
    this.heats.markDirty()
  }

  private resolveUser(identifiers: UserIdentifier): HeatUser {
    const identifiedUsers = this.heats.data.filter((user) => matchUserIdentifier(identifiers, user.identifiers))
    const newIdentifiers = new Set<string>([
      ...identifiedUsers.flatMap((user) => user.identifiers),
      ...userIdentifiersToList(identifiers)
    ])
    const userHeatActions = identifiedUsers.flatMap((user) => user.heatActions)

    const lastWarning = new Map<HeatType, number>()
    for (const identifiedUser of identifiedUsers) {
      const entries =
        identifiedUser.lastWarning instanceof Map
          ? [...identifiedUser.lastWarning.entries()]
          : (Object.entries(identifiedUser.lastWarning) as [HeatType, number][])

      for (const [type, timestamp] of entries) {
        const savedTimestamp = lastWarning.get(type) ?? 0
        if (timestamp > savedTimestamp) lastWarning.set(type, timestamp)
      }
    }

    return {
      identifiers: [...newIdentifiers],
      heatActions: this.deleteExpiredActions(userHeatActions),
      lastWarning: lastWarning
    } satisfies HeatUser
  }

  private resolveType(type: HeatType): { expire: number; maxLimit: number; warnLimit: number; warnEvery: number } {
    const config = this.config.data
    const common = { expire: CommandsHeat.ActionExpiresAfter, warnEvery: CommandsHeat.WarnEvery }
    switch (type) {
      case HeatType.Mute: {
        return { ...common, ...CommandsHeat.resolveLimits(config.mutesPerDay) }
      }
      case HeatType.Kick: {
        return { ...common, ...CommandsHeat.resolveLimits(config.kicksPerDay) }
      }
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Type ${type} does not exists??`)
  }

  private deleteExpiredActions(heatActions: HeatAction[]): HeatAction[] {
    const currentTimestamp = Date.now()
    const results: HeatAction[] = []

    for (const heatAction of heatActions) {
      const expirationTime = this.resolveType(heatAction.type).expire
      if (heatAction.timestamp + expirationTime < currentTimestamp) continue
      results.push(heatAction)
    }

    return results
  }

  private static resolveLimits(maxLimit: number): { maxLimit: number; warnLimit: number } {
    const limits = { maxLimit: maxLimit, warnLimit: maxLimit }
    if (maxLimit <= 0) {
      limits.maxLimit = limits.warnLimit = Number.MAX_SAFE_INTEGER
      return limits
    } else if (maxLimit === 1) {
      return limits
    } else {
      limits.warnLimit = maxLimit * this.WarnPercentage
      return limits
    }
  }
}

interface HeatUser {
  identifiers: string[]
  heatActions: HeatAction[]
  lastWarning: Map<HeatType, number>
}

interface HeatAction {
  timestamp: number
  type: HeatType
}

export enum HeatType {
  Kick = 'kick',
  Mute = 'mute'
}

export enum HeatResult {
  Allowed = 'allowed',
  Warn = 'warn',
  Denied = 'denied'
}
