import type { Guild } from 'discord.js'

import type Application from '../../application'
import type { User } from '../../common/user'
// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType, type PresetListOption } from '../../instance/discord/utility/options-handler'

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class ConditionHandler<T extends ConditionOption, ValueType extends ConditionValue> {
  public abstract getId(): string

  public abstract getDisplayName(context: HandlerContext): string

  public abstract displayCondition(context: HandlerDisplayContext, options: T): Promise<string> | string

  public abstract meetsCondition(
    context: HandlerOperationContext,
    user: HandlerUser,
    condition: T
  ): Promise<ConditionResult<ValueType>> | ConditionResult<ValueType>

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

export type ConditionValue = string | number | boolean

export enum ConditionResultType {
  Pass = 'meet',
  Fail = 'notMeet',
  Error = 'error'
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export type ConditionResult<ValueType extends ConditionValue> =
  ConditionSuccessfulResult<ValueType> | ConditionFailureResult

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ConditionSuccessfulResult<ValueType extends ConditionValue> {
  /**
   * Whether the condition is met or not
   */
  type: ConditionResultType.Pass | ConditionResultType.Fail
  /**
   * The value that was compared or at least best fit
   */
  value: ValueType
  valueFormatted: string
}

export interface ConditionFailureResult {
  type: ConditionResultType.Error
  /**
   * Reason why the condition could not be checked in the first place
   */
  reason: string
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
  user: User
}

export type ConditionOption = Record<string, string | number | boolean | string[]>

export interface ConditionId {
  id: number | bigint
  createdAt: number
  typeId: string
  options: ConditionOption
  guildId: string
}

export enum OnUnmet {
  Remove = 'remove',
  Keep = 'keep'
}

export const SkyblockProfileOption: Omit<PresetListOption, 'getOption' | 'setOption'> & {
  defaultValue?: ReturnType<PresetListOption['getOption']>
  key: string
} = {
  type: OptionType.PresetList,
  name: 'Profile Type',
  description: 'Which Skyblock profile types are allowed for this condition.',
  key: 'profileTypes',
  min: 1,
  max: 10,
  options: [
    { label: 'Classic', value: 'classic' },
    { label: '♲ Ironman', value: 'ironman' },
    { label: 'Ⓑ Bingo', value: 'bingo' },
    { label: '☀ Stranded', value: 'island' }
  ],
  defaultValue: ['classic', 'ironman', 'bingo', 'island']
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SkyblockProfileOptionType = { profileTypes: ('classic' | 'ironman' | 'bingo' | 'island')[] }

export function translateSkyblockProfileTypes(types: SkyblockProfileOptionType['profileTypes']): string {
  const result = []
  if (types.includes('classic')) result.push('Ⓢ')
  if (types.includes('ironman')) result.push('♲')
  if (types.includes('bingo')) result.push('Ⓑ')
  if (types.includes('island')) result.push('☀')
  return `[${result.join('')}]`
}
