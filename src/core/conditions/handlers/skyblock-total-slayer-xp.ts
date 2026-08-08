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

export class SkyblockTotalSlayerXp extends ConditionHandler<SkyblockTotalSlayerXpOptions, number> {
  override getId(): string {
    return 'skyblock-total-slayer-xp'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.slayer-total-xp.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockTotalSlayerXpOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.slayer-total-xp.formatted'], {
      fromXp: options.fromXp,
      toXp: options.toXp,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockTotalSlayerXpOptions
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
      .map((profile) =>
        Object.values(profile.slayer?.slayer_bosses ?? {})
          .map((slayer) => slayer.xp ?? 0)
          .reduce((a, b) => a + b, 0)
      )
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

    return {
      type:
        highestLevel >= condition.fromXp && highestLevel <= condition.toXp
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
        name: 'From Total Slayer Experience',
        key: 'fromXp',
        max: Number.MAX_SAFE_INTEGER,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Total Slayer Experience',
        key: 'toXp',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      }
    ]
  }
}

export type SkyblockTotalSlayerXpOptions = SkyblockProfileOptionType & { fromXp: number; toXp: number }
