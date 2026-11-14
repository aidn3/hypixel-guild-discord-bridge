// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler.js'
import Duration from '../../../utility/duration.js'
import type {
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common.js'
import { ConditionHandler, ConditionResultType } from '../common.js'
import { formatPrimitiveValue, noHypixelKey } from '../utilities.js'

export class HypixelOfflineForDuration extends ConditionHandler<ConditionOptions, number> {
  override getId(): string {
    return 'hypixel-offline-for-duration'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.hypixel-offline-for-duration.title'])
  }

  override displayCondition(context: HandlerDisplayContext, options: ConditionOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.hypixel-offline-for-duration.formatted'], {
      fromDays: options.fromDays,
      toDays: options.toDays
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: ConditionOptions
  ): Promise<ConditionResult<number>> {
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

    const earliestTime = player.lastLogout
    if (earliestTime === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.user-api-disabled'])
      }
    }

    const days = (Date.now() - earliestTime) / Duration.days(1).toMilliseconds()
    return {
      type: days >= options.fromDays && days <= options.toDays ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: days,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, Math.floor(days))
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'From Days',
        key: 'fromDays',
        max: Number.MAX_SAFE_INTEGER,
        min: 0
      },
      {
        type: OptionType.Number,
        name: 'To Days',
        key: 'toDays',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ConditionOptions = { fromDays: number; toDays: number }
