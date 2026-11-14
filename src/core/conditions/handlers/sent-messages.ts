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
import { formatPrimitiveValue } from '../utilities.js'

export class SentMessages extends ConditionHandler<ConditionOptionsType, number> {
  override getId(): string {
    return 'sent-messages'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.sent-messages.title'])
  }

  override displayCondition(context: HandlerDisplayContext, options: ConditionOptionsType): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.sent-messages.formatted'], {
      count: options.count,
      days: options.days
    })
  }

  public override meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: ConditionOptionsType
  ): ConditionResult<number> {
    const currentTime = Date.now()
    const rows = context.application.core.scoresManager.getMessagesByUser(
      handlerUser.user.allIdentifiers(),
      currentTime,
      currentTime - Duration.days(options.days).toMilliseconds()
    )

    const result = rows.map((entry) => entry.count).reduce((a, b) => a + b, 0)

    return {
      type: result >= options.count ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: result,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, result)
    }
  }
  override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'Messages Count',
        key: 'count',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      },
      {
        type: OptionType.Number,
        name: 'Days',
        key: 'days',
        max: Number.MAX_SAFE_INTEGER,
        min: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ConditionOptionsType = { count: number; days: number }
