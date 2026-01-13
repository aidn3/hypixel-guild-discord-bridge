import type { Guild, GuildMember } from 'discord.js'

import type Application from '../../../application'
import type { DiscordUser } from '../../../common/user'
import type { ConditionOption, NicknameCondition, RoleCondition } from '../../../core/discord/user-conditions'
import type { ModalOption } from '../utility/modal-options'

export interface UpdateMemberContext extends UpdateGuildContext {
  member: GuildMember
  user: DiscordUser
}

export interface UpdateGuildContext extends UpdateContext {
  rolesConditions: RoleCondition[]
  nicknameConditions: NicknameCondition[]
}

export interface UpdateContext extends HandlerContext {
  updateReason: string
  abortSignal: AbortSignal
  /**
   * Auto updated inside the code
   */
  progress: UpdateProgress
}

export interface HandlerContext {
  application: Application
  startTime: number
  guild: Guild
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

export abstract class ConditionHandler<T extends ConditionOption> {
  public abstract getId(): string

  public abstract getDisplayName(context: HandlerContext): string

  public abstract displayCondition(context: HandlerContext, options: T): Promise<string> | string

  public abstract meetsCondition(context: UpdateMemberContext, condition: T): Promise<boolean> | boolean

  public createOptions(): ModalOption[] {
    return []
  }

  public createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption,
    prompt: ModalOption[]
  ): Promise<T | string> | T | string {
    const result: ConditionOption = {}

    for (const entry of prompt) {
      result[entry.key] = rawOptions[entry.key]
    }

    return result as T
  }
}
