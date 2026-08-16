import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common.js'
import { ConditionHandler, ConditionResultType } from '../common.js'
import { formatPrimitiveValue } from '../utilities.js'

export class NotLinked extends ConditionHandler<LinkedBindingCondition, boolean> {
  override getId(): string {
    return 'has-not-linked'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.not-link.title'])
  }

  override displayCondition(context: HandlerDisplayContext): string {
    let linkCommand = '0'
    if (context.discordGuild !== undefined) {
      const guildCommands = context.discordGuild.client.application.commands.cache
      linkCommand = guildCommands.find((command) => command.name === 'link')?.id ?? '0'
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.not-link.formatted'], {
      commandId: linkCommand
    })
  }

  public override meetsCondition(context: HandlerOperationContext, handlerUser: HandlerUser): ConditionResult<boolean> {
    const result = !handlerUser.user.verified()
    return {
      type: result ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: result,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, result)
    }
  }
}

export type LinkedBindingCondition = ConditionOption // empty {}
