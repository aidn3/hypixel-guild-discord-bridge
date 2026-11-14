// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
import { TotalUniqueTrophyFish } from '../../hypixel/hypixel-skyblock.js'
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
import { formatPrimitiveValue, getSkyblockUserProfiles, noHypixelKey } from '../utilities.js'

export class SkyblockTrophyFishSilver extends ConditionHandler<SkyblockOptions, number> {
  override getId(): string {
    return 'skyblock-trophy-fish-silver'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-trophy-fish-silver.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-trophy-fish-silver.formatted'], {
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockOptions
  ): Promise<ConditionResult<number>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const hypixel = context.application.hypixel()
    if (hypixel === undefined) return noHypixelKey(context.application.i18n.t).meetsCondition
    const profiles = await getSkyblockUserProfiles(context, hypixel, mojangProfile, condition.profileTypes)
    if (profiles.length === 0) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-skyblock'])
      }
    }

    let total = 0
    for (const profile of profiles) {
      if (profile.trophy_fish === undefined) continue
      const totalProfile = Object.keys(profile.trophy_fish).filter((part) => part.endsWith('_silver')).length
      if (totalProfile > total) total = totalProfile
    }

    return {
      type: total >= TotalUniqueTrophyFish ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: total,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, total)
    }
  }

  public override createOptions(): ModalOption[] {
    return [SkyblockProfileOption]
  }
}

export type SkyblockOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
