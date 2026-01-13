import type { ConditionOption } from '../../../../core/discord/user-conditions'
import type { HandlerContext, UpdateMemberContext } from '../common'
import { ConditionHandler } from '../common'

export class Linked extends ConditionHandler<LinkedBindingCondition> {
  override getId(): string {
    return 'has-linked'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.link.title'])
  }

  override async displayCondition(context: HandlerContext): Promise<string> {
    const guildCommands = await context.guild.commands.fetch()
    const linkCommand = guildCommands.find((command) => command.name === 'link')?.id ?? '0'

    return context.application.i18n.t(($) => $['discord.conditions.handler.link.formatted'], { commandId: linkCommand })
  }

  public override meetsCondition(context: UpdateMemberContext): boolean {
    return context.user.verified()
  }
}

export type LinkedBindingCondition = ConditionOption // empty {}
