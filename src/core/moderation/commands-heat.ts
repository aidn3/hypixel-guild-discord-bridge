import type { Logger } from 'log4js'

import type Application from '../../application'
import { ConfigManager } from '../../common/config-manager'
import type { User, UserIdentifier } from '../../common/user'
import Duration from '../../utility/duration'
import type { ModerationConfig } from '../core'

export class CommandsHeat {
  private static readonly ActionExpiresAfter = Duration.days(1)
  private static readonly WarnPercentage = 0.8
  private static readonly WarnEvery = Duration.minutes(30)

  private readonly heatsConfig
  private readonly moderationConfig

  constructor(application: Application, config: ConfigManager<ModerationConfig>, logger: Logger) {
    this.moderationConfig = config
    this.heatsConfig = new ConfigManager<HeatConfig>(
      application,
      logger,
      application.getConfigFilePath('commands-heat.json'),
      {
        heats: [],
        lastWarning: []
      }
    )
  }

  public add(user: User, type: HeatType): HeatResult {
    const currentTime = Date.now()

    if (user.immune()) {
      this.heatsConfig.data.heats.push({ identifier: user.getUserIdentifier(), timestamp: currentTime, type: type })
      this.heatsConfig.markDirty()
      return HeatResult.Allowed
    }

    const heatActions = this.getUserHeats(currentTime, user, type)
    const typeInfo = this.resolveType(type)

    this.heatsConfig.data.heats.push({ identifier: user.getUserIdentifier(), timestamp: currentTime, type: type })
    this.heatsConfig.markDirty()

    if (heatActions >= typeInfo.maxLimit) return HeatResult.Denied

    // 1+ added to help with low warnLimit
    if (heatActions + 1 >= typeInfo.warnLimit && !this.warned(currentTime, user, type)) {
      this.setLastWarning(currentTime, user, type)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  public tryAdd(user: User, type: HeatType): HeatResult {
    const currentTime = Date.now()

    if (user.immune()) {
      this.heatsConfig.data.heats.push({ identifier: user.getUserIdentifier(), timestamp: currentTime, type: type })
      this.heatsConfig.markDirty()
      return HeatResult.Allowed
    }

    const heatActions = this.getUserHeats(currentTime, user, type)
    const typeInfo = this.resolveType(type)

    if (heatActions >= typeInfo.maxLimit) return HeatResult.Denied

    this.heatsConfig.data.heats.push({ identifier: user.getUserIdentifier(), timestamp: currentTime, type: type })
    this.heatsConfig.markDirty()

    // 1+ added to help with low warnLimit
    if (heatActions + 1 >= typeInfo.warnLimit && !this.warned(currentTime, user, type)) {
      this.setLastWarning(currentTime, user, type)
      return HeatResult.Warn
    }

    return HeatResult.Allowed
  }

  private getUserHeats(currentTime: number, user: User, type: HeatType): number {
    let count = 0

    for (const heat of this.heatsConfig.data.heats) {
      if (heat.type !== type) continue
      if (!user.equalsIdentifier(heat.identifier)) continue
      if (heat.timestamp + CommandsHeat.ActionExpiresAfter.toMilliseconds() < currentTime) continue
      count++
    }

    return count
  }

  private warned(currentTime: number, user: User, type: HeatType): boolean {
    let lastWarning = -1

    for (const warning of this.heatsConfig.data.lastWarning) {
      if (!user.equalsIdentifier(warning.identifier)) continue
      if (warning.type !== type) continue

      if (warning.timestamp > lastWarning) lastWarning = warning.timestamp
    }

    return lastWarning + CommandsHeat.WarnEvery.toMilliseconds() > currentTime
  }

  private setLastWarning(timestamp: number, user: User, type: HeatType): void {
    const warnings = this.heatsConfig.data.lastWarning
    for (let index = 0; index < warnings.length; index++) {
      const warning = warnings[index]
      if (!user.equalsIdentifier(warning.identifier)) continue

      warnings.splice(index, 1)
      this.heatsConfig.markDirty()
    }

    this.heatsConfig.data.lastWarning.push({ identifier: user.getUserIdentifier(), timestamp: timestamp, type: type })
    this.heatsConfig.markDirty()
  }

  private resolveType(type: HeatType): { expire: Duration; maxLimit: number; warnLimit: number; warnEvery: Duration } {
    const config = this.moderationConfig.data
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

interface HeatAction {
  identifier: UserIdentifier
  type: HeatType
  timestamp: number
}

interface HeatConfig {
  heats: HeatAction[]
  lastWarning: Warning[]
}

interface Warning {
  identifier: UserIdentifier
  type: HeatType
  timestamp: number
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
