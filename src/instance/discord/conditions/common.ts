import type { GuildMember } from 'discord.js'

import type { HandlerOperationContext, HandlerUser } from '../../../core/conditions/common'
import type { ConditionsRegistry } from '../../../core/conditions/conditions-registry'
import type { NicknameCondition, RoleCondition } from '../../../core/discord/user-conditions'
import type { PlaceholderManager } from '../../../core/placeholder/placeholder-manager'

export interface UpdateMemberContext extends HandlerUser {
  guildMember: GuildMember
}

export interface UpdateGuildContext extends UpdateContext {
  placeholderManager: PlaceholderManager
  conditionsRegistry: ConditionsRegistry

  rolesConditions: RoleCondition[]
  nicknameConditions: NicknameCondition[]
}

export interface UpdateContext extends HandlerOperationContext {
  updateReason: string
  /**
   * Auto updated inside the code
   */
  progress: UpdateProgress
}

export interface UpdateProgress {
  totalGuilds: number
  processedGuilds: number

  totalUsers: number
  processedUsers: number

  processedRoles: number
  processedNicknames: number

  errors: string[]
}
