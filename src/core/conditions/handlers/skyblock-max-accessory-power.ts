// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler.js'
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

export class SkyblockMaxAccessoryPower extends ConditionHandler<ConditionOptions, number> {
  override getId(): string {
    return 'reached-hypixel-skyblock-max-accessory-power'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-max-accessory-power.title'])
  }

  override displayCondition(context: HandlerContext, options: ConditionOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-max-accessory-power.formatted'], {
      from: options.from,
      to: options.to,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: ConditionOptions
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

    const highestLevel = profiles
      .map((profile) => profile.accessory_bag_storage?.highest_magical_power ?? 0)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

    return {
      type:
        highestLevel >= condition.from && highestLevel <= condition.to
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
        name: 'From Max Accessory Power',
        key: 'from',
        max: 10_000,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Max Accessory Power',
        key: 'to',
        max: 10_000,
        min: 1
      }
    ]
  }
}

export type ConditionOptions = SkyblockProfileOptionType & { from: number; to: number }
