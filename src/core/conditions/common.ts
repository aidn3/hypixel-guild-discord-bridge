import type { Guild } from 'discord.js'

import type Application from '../../application'
import type { DiscordUser } from '../../common/user'
// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../instance/discord/utility/modal-options'

export abstract class ConditionHandler<T extends ConditionOption> {
  public abstract getId(): string

  public abstract getDisplayName(context: HandlerContext): string

  public abstract displayCondition(context: HandlerDisplayContext, options: T): Promise<string> | string

  public abstract meetsCondition(
    context: HandlerOperationContext,
    user: HandlerUser,
    condition: T
  ): Promise<boolean> | boolean

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

export interface HandlerContext {
  application: Application
  startTime: number
}

export interface HandlerDisplayContext extends HandlerContext {
  discordGuild: Guild | undefined
}

export interface HandlerOperationContext extends HandlerContext {
  abortSignal: AbortSignal
}

export interface HandlerUser {
  user: DiscordUser
}

export type ConditionOption = Record<string, string | number | boolean | string[]>

export interface ConditionId {
  id: string
  typeId: string
  options: ConditionOption
  guildId: string
  createdAt: string
}

export enum OnUnmet {
  Remove = 'remove',
  Keep = 'keep'
}
