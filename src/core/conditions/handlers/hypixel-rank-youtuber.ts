import { getPlayerRank, HypixelPlayerRank } from '../../hypixel/hypixel-player.js'
import type {
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common.js'
import { ConditionHandler, ConditionResultType } from '../common.js'
import { formatPrimitiveValue, noHypixelKey } from '../utilities.js'

export class HypixelRankYoutuber extends ConditionHandler<InGuildOptions, string> {
  override getId(): string {
    return 'hypixel-rank-youtuber'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.hypixel-rank-youtuber.title'])
  }

  override displayCondition(context: HandlerDisplayContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.hypixel-rank-youtuber.formatted'])
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser
  ): Promise<ConditionResult<string>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }
    const uuid = mojangProfile.id

    const hypixel = context.application.hypixel()
    if (hypixel === undefined) return noHypixelKey(context.application.i18n.t).meetsCondition
    const player = await hypixel.getPlayer(uuid, context.startTime)
    if (player === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-hypixel'])
      }
    }

    const result = getPlayerRank(player)
    return {
      type: result === HypixelPlayerRank.Youtuber ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: result,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, result)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
export type InGuildOptions = {}
