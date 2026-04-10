import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import type {
  ConditionOption,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common'
import { ConditionHandler } from '../common'

export class HasDiscordRole extends ConditionHandler<HasDiscordRoleOptions> {
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
  ): Promise<boolean> {
    const discordProfile = handlerUser.user.discordProfile()
    if (discordProfile === undefined) return false

    const client = context.application.discordInstance.getClient()
    const guild = await client.guilds.fetch(options.guildId).catch(() => undefined)
    if (guild === undefined) return false

    const member = await guild.members.fetch(discordProfile.id).catch(() => undefined)
    if (member === undefined) return false

    return member.roles.cache.has(options.roleId)
  }

  override async createCondition(context: HandlerContext, rawOptions: ConditionOption): Promise<HasDiscordRoleOptions> {
    const client = context.application.discordInstance.getClient()
    const roleId = (rawOptions.roleId as string[])[0]

    for (const guild of client.guilds.cache.values()) {
      const role = await guild.roles.fetch(roleId)
      if (!role) continue

      return { guildId: guild.id, roleId: roleId }
    }

    assert.fail(`could not find the guild for the role ${roleId}`)
  }

  public override createOptions(): ModalOption[] {
    return [
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
