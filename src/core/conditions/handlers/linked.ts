import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common'
import { ConditionHandler, ConditionResultType } from '../common'
import { formatPrimitiveValue } from '../utilities'

export class Linked extends ConditionHandler<LinkedBindingCondition, boolean> {
  override getId(): string {
    return 'has-linked'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.link.title'])
  }

  override displayCondition(context: HandlerDisplayContext): string {
    let linkCommand = '0'
    if (context.discordGuild !== undefined) {
      const guildCommands = context.discordGuild.client.application.commands.cache
      linkCommand = guildCommands.find((command) => command.name === 'link')?.id ?? '0'
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.link.formatted'], { commandId: linkCommand })
  }

  public override meetsCondition(context: HandlerOperationContext, handlerUser: HandlerUser): ConditionResult<boolean> {
    const result = handlerUser.user.verified()
    return {
      type: result ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: result,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, result)
    }
  }
}

export type LinkedBindingCondition = ConditionOption // empty {}
