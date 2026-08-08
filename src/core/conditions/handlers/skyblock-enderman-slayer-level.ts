// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import { getSlayerLevel, SlayerHighestLevel } from '../../hypixel/hypixel-skyblock'
import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, ConditionResultType, SkyblockProfileOption, translateSkyblockProfileTypes } from '../common'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities'

export class SkyblockEndermanLevel extends ConditionHandler<SkyblockEndermanLevelOptions, number> {
  override getId(): string {
    return 'skyblock-enderman-slayer-level'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.enderman-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockEndermanLevelOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.enderman-level.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockEndermanLevelOptions
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
      .map((profile) => profile.slayer?.slayer_bosses.enderman.xp ?? 0)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))
    const highestLevel = getSlayerLevel(highestExperience, 'enderman')

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
        name: 'From Enderman Level',
        key: 'fromLevel',
        max: SlayerHighestLevel.enderman,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Enderman Level',
        key: 'toLevel',
        max: SlayerHighestLevel.enderman,
        min: 1
      }
    ]
  }
}

export type SkyblockEndermanLevelOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
