import type { Logger } from 'log4js'

import type { ModerationConfig } from '../../application-config.js'
import type Application from '../../application.js'
import type { InstanceType, UserIdentifier } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import EventHandler from '../../common/event-handler.js'
import type EventHelper from '../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import type ModerationInstance from './moderation-instance.js'
import { matchIdentifiersLists, matchUserIdentifier, userIdentifiersToList } from './util.js'

export class CommandsHeat extends EventHandler<ModerationInstance, InstanceType.Moderation> {
  private static readonly ActionExpiresAfter: number = 24 * 60 * 60 * 10
  private static readonly WarnPercentage = 0.8
  private static readonly WarnEvery = 30 * 60 * 1000

  private readonly configManager

  constructor(
    application: Application,
    clientInstance: ModerationInstance,
    eventHelper: EventHelper<InstanceType.Moderation>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly config: ModerationConfig
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.configManager = new ConfigManager<HeatUser[]>(application, 'commands-heat.json', [])
    this.configManager.loadFromConfig()
  }

  public status(identifiers: UserIdentifier, type: HeatType): HeatResult {
    if (this.clientInstance.immune(identifiers)) return HeatResult.Allowed

    const user = this.resolveUser(identifiers)
    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length

    if (count >= typeInfo.maxLimit) return HeatResult.Denied
    if (count >= typeInfo.warnLimit) return HeatResult.Warn
    return HeatResult.Allowed
  }

  public add(identifier: UserIdentifier, type: HeatType): HeatResult {
    const user = this.resolveUser(identifier)
    user.heatActions.push({ timestamp: Date.now(), type: type })
    this.addUser(user)

    if (this.clientInstance.immune(identifier)) return HeatResult.Allowed

    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length
    if (count >= typeInfo.maxLimit) return HeatResult.Denied

    const currentTimestamp = Date.now()
    if (count >= typeInfo.warnLimit && (user.lastWarning.get(type) ?? 0) + typeInfo.expire < currentTimestamp) {
      user.lastWarning.set(type, currentTimestamp)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  public tryAdd(identifier: UserIdentifier, type: HeatType): HeatResult {
    const user = this.resolveUser(identifier)
    user.heatActions.push({ timestamp: Date.now(), type: type })

    if (this.clientInstance.immune(identifier)) {
      this.addUser(user)
      return HeatResult.Allowed
    }

    const typeInfo = this.resolveType(type)
    const count = user.heatActions.filter((action) => action.type === type).length
    if (count >= typeInfo.maxLimit) return HeatResult.Denied

    this.addUser(user)
    const currentTimestamp = Date.now()
    if (count >= typeInfo.warnLimit && (user.lastWarning.get(type) ?? 0) + typeInfo.expire < currentTimestamp) {
      user.lastWarning.set(type, currentTimestamp)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  private addUser(heatUser: HeatUser): void {
    this.configManager.data = this.configManager.data.filter(
      (user) => !matchIdentifiersLists(heatUser.identifiers, user.identifiers)
    )
    this.configManager.data.push(heatUser)
    this.configManager.saveConfig()
  }

  private resolveUser(identifiers: UserIdentifier): HeatUser {
    const identifiedUsers = this.configManager.data.filter((user) => matchUserIdentifier(identifiers, user.identifiers))
    const newIdentifiers = [
      ...identifiedUsers.flatMap((user) => user.identifiers),
      ...userIdentifiersToList(identifiers)
    ]
    const userHeatActions = identifiedUsers.flatMap((user) => user.heatActions)

    const lastWarning = new Map<HeatType, number>()
    for (const identifiedUser of identifiedUsers) {
      for (const [type, timestamp] of identifiedUser.lastWarning.entries()) {
        const savedTimestamp = lastWarning.get(type) ?? 0
        if (timestamp > savedTimestamp) lastWarning.set(type, timestamp)
      }
    }

    return {
      identifiers: newIdentifiers,
      heatActions: this.deleteExpiredActions(userHeatActions),
      lastWarning: lastWarning
    } satisfies HeatUser
  }

  private resolveType(type: HeatType): { expire: number; maxLimit: number; warnLimit: number; warnEvery: number } {
    const common = { expire: CommandsHeat.ActionExpiresAfter, warnEvery: CommandsHeat.WarnEvery }
    switch (type) {
      case HeatType.Mute: {
        return { ...common, ...CommandsHeat.resolveLimits(this.config.mutesPerDay) }
      }
      case HeatType.Kick: {
        return { ...common, ...CommandsHeat.resolveLimits(this.config.kicksPerDay) }
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
      if (heatAction.timestamp + expirationTime > currentTimestamp) continue
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
