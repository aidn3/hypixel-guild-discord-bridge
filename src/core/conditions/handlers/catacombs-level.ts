// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import { getDungeonLevelWithOverflow } from '../../hypixel/hypixel-skyblock'
import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, ConditionResultType, SkyblockProfileOption, translateSkyblockProfileTypes } from '../common'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities'

export class CatacombsLevel extends ConditionHandler<SkyblockCatacombsOptions, number> {
  override getId(): string {
    return 'reached-hypixel-skyblock-catacombs-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockCatacombsOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockCatacombsOptions
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
      .map((profile) => profile.dungeons?.dungeon_types.catacombs.experience ?? 0)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

    const level = Math.floor(getDungeonLevelWithOverflow(highestExperience))

    return {
      type:
        level >= condition.fromLevel && level <= condition.toLevel
          ? ConditionResultType.Pass
          : ConditionResultType.Fail,
      value: level,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, level)
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      SkyblockProfileOption,
      {
        type: OptionType.Number,
        name: 'From Catacombs Level',
        key: 'fromLevel',
        max: 10_000,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Catacombs Level',
        key: 'toLevel',
        max: 10_000,
        min: 1
      }
    ]
  }
}

export type SkyblockCatacombsOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
