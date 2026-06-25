// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import { kuudraCollection } from '../../hypixel/hypixel-skyblock'
import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, ConditionResultType, SkyblockProfileOption, translateSkyblockProfileTypes } from '../common'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities'

export class KuudraCollection extends ConditionHandler<SkyblockKuudraOptions, number> {
  override getId(): string {
    return 'reached-hypixel-skyblock-kuudra-collection'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['conditions.skyblock-kuudra-collection.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockKuudraOptions): string {
    return context.application.i18n.t(($) => $['conditions.skyblock-kuudra-collection.formatted'], {
      from: options.from,
      to: options.to,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockKuudraOptions
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

    const total = profiles
      .map((profile) => profile.nether_island_player_data?.kuudra_completed_tiers)
      .filter((entry) => entry !== undefined)
      .map((entry) => kuudraCollection(entry))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

    return {
      type: total >= condition.from && total <= condition.to ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: total,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, total)
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      SkyblockProfileOption,
      {
        type: OptionType.Number,
        name: 'From Kuudra Collection',
        key: 'from',
        max: Number.MAX_SAFE_INTEGER,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Kuudra Collection',
        key: 'to',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      }
    ]
  }

  override async createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption,
    prompt: ModalOption[]
  ): Promise<SkyblockKuudraOptions | string> {
    const from = rawOptions.from as number
    const to = rawOptions.to as number

    if (from > to) return context.application.i18n.t(($) => $['conditions.format.from-greater-than-to'], { from, to })

    return super.createCondition(context, rawOptions, prompt)
  }
}

export type SkyblockKuudraOptions = SkyblockProfileOptionType & { from: number; to: number }
