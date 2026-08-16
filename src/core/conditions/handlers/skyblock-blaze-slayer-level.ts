// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler.js'
import { getSlayerLevel } from '../../hypixel/hypixel-skyblock.js'
import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common.js'
import {
  ConditionHandler,
  ConditionResultType,
  SkyblockProfileOption,
  translateSkyblockProfileTypes
} from '../common.js'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities.js'

export class SkyblockBlazeLevel extends ConditionHandler<SkyblockBlazeLevelOptions, number> {
  override getId(): string {
    return 'skyblock-blaze-slayer-level'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.blaze-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockBlazeLevelOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.blaze-level.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockBlazeLevelOptions
  ): Promise<ConditionResult<number>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const profiles = await getSkyblockUserProfiles(context, mojangProfile, condition.profileTypes)
    if (profiles.length === 0) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-skyblock'])
      }
    }

    const highestExperience = profiles
      .map((profile) => profile.slayer?.slayer_bosses.blaze.xp ?? 0)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))
    const highestLevel = getSlayerLevel(highestExperience, 'blaze')

    return {
      type:
        highestLevel >= condition.fromLevel && highestLevel <= condition.toLevel
          ? ConditionResultType.Pass
          : ConditionResultType.Fail,
      value: highestLevel,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, highestLevel)
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      SkyblockProfileOption,
      {
        type: OptionType.Number,
        name: 'From Blaze Level',
        key: 'fromLevel',
        max: Number.MAX_SAFE_INTEGER,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Blaze Level',
        key: 'toLevel',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      }
    ]
  }
}

export type SkyblockBlazeLevelOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
