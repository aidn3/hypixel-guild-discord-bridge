import { DiscordAPIError } from 'discord.js'

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

export class InDiscordServer extends ConditionHandler<InDiscordServerOptions, boolean> {
  override getId(): string {
    return 'in-discord-server'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-discord-server.title'])
  }

  override async displayCondition(context: HandlerDisplayContext, options: InDiscordServerOptions): Promise<string> {
    const client = context.application.discordInstance.getClient()
    const guild = await client.guilds.fetch(options.guildId).catch(() => undefined)
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-discord-server.formatted'], {
      serverName: guild?.name ?? options.guildId
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: InDiscordServerOptions
  ): Promise<ConditionResult<boolean>> {
    const discordProfile = handlerUser.user.discordProfile()
    if (discordProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const client = context.application.discordInstance.getClient()

    const guild = await client.guilds.fetch(options.guildId).catch(() => undefined)
    if (guild === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.discord-server-not-found'])
      }
    }

    try {
      await guild.members.fetch(discordProfile.id)
      return {
        type: ConditionResultType.Pass,
        value: true,
        valueFormatted: formatPrimitiveValue(context.application.i18n.t, true)
      }
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError && error.code === 10_007) {
        return {
          type: ConditionResultType.Fail,
          value: false,
          valueFormatted: formatPrimitiveValue(context.application.i18n.t, false)
        }
      }

      return {
        type: ConditionResultType.Error,
        reason: error instanceof Error ? error.message : String(error)
      }
    }
  }

  override createCondition(context: HandlerContext, rawOptions: ConditionOption): InDiscordServerOptions {
    return { guildId: rawOptions.guildId as string }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.DiscordGuild,
        name: 'Discord Server',
        key: 'guildId'
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InDiscordServerOptions = {
  guildId: string
}
