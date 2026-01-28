import type {
  ConditionOption,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common'
import { ConditionHandler } from '../common'

export class Linked extends ConditionHandler<LinkedBindingCondition> {
  override getId(): string {
    return 'has-linked'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.link.title'])
  }

  override async displayCondition(context: HandlerDisplayContext): Promise<string> {
    let linkCommand = '0'
    if (context.discordGuild !== undefined) {
      const guildCommands = await context.discordGuild.commands.fetch()
      linkCommand = guildCommands.find((command) => command.name === 'link')?.id ?? '0'
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.link.formatted'], { commandId: linkCommand })
  }

  public override meetsCondition(context: HandlerOperationContext, handlerUser: HandlerUser): boolean {
    return handlerUser.user.verified()
  }
}

export type LinkedBindingCondition = ConditionOption // empty {}
