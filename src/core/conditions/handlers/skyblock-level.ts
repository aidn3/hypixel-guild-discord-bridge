// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, ConditionResultType, SkyblockProfileOption, translateSkyblockProfileTypes } from '../common'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities'

export class SkyblockLevel extends ConditionHandler<SkyblockLevelOptions, number> {
  override getId(): string {
    return 'reached-hypixel-skyblock-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockLevelOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockLevelOptions
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

    const highestLevel = profiles
      .map((profile) => Math.floor((profile.leveling?.experience ?? 0) / 100))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

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
        name: 'From Skyblock Level',
        key: 'fromLevel',
        max: 10_000,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Skyblock Level',
        key: 'toLevel',
        max: 10_000,
        min: 1
      }
    ]
  }
}

export type SkyblockLevelOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
