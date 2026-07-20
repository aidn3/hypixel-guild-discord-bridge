// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
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

export class HasDiscordRole extends ConditionHandler<HasDiscordRoleOptions, boolean> {
  override getId(): string {
    return 'has-discord-role'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.has-discord-role.title'])
  }

  override displayCondition(context: HandlerDisplayContext, options: HasDiscordRoleOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.has-discord-role.formatted'], {
      roleId: options.roleId
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: HasDiscordRoleOptions
  ): Promise<ConditionResult<boolean>> {
    const discordProfile = handlerUser.user.discordProfile()
    if (discordProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.no-discord-linked'])
      }
    }

    const client = context.application.discordInstance.getClient()
    const guild = await client.guilds.fetch(options.guildId).catch(() => undefined)
    if (guild === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.discord-server-deleted'])
      }
    }

    const member = await guild.members.fetch(discordProfile.id).catch(() => undefined)
    if (member === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.user-not-in-server'])
      }
    }

    const result = member.roles.cache.has(options.roleId)
    return {
      type: result ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: result,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, result)
    }
  }

  override createCondition(context: HandlerContext, rawOptions: ConditionOption): HasDiscordRoleOptions {
    const roleId = (rawOptions.roleId as string[])[0]
    return { guildId: rawOptions.guildId as string, roleId }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.DiscordGuild,
        name: 'Discord Server',
        key: 'guildId'
      },
      {
        type: OptionType.Role,
        name: 'Role',
        description: 'Which discord role should the user have for this condition to be met.',
        key: 'roleId',
        min: 1,
        max: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type HasDiscordRoleOptions = { guildId: string; roleId: string }
