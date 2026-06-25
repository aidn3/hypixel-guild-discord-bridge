// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
import type { HandlerContext, HandlerDisplayContext, HandlerOperationContext, HandlerUser } from '../common'
import { ConditionHandler } from '../common'

export class InDiscordServer extends ConditionHandler<InDiscordServerOptions> {
  override getId(): string {
    return 'in-discord-server'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-discord-server.title'])
  }

  override displayCondition(context: HandlerDisplayContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-discord-server.formatted'])
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: InDiscordServerOptions
  ): Promise<boolean> {
    const discordProfile = handlerUser.user.discordProfile()
    if (discordProfile === undefined) return false

    const client = context.application.discordInstance.getClient()

    // Try the configured guild, otherwise fallback to the first guild in cache (if any)
    const guild = (await client.guilds.fetch(options.guildId).catch(() => undefined)) ?? client.guilds.cache.first()
    if (guild === undefined) return false

    const member = await guild.members.fetch(discordProfile.id).catch(() => undefined)
    return member !== undefined
  }

  override createCondition(context: HandlerContext): InDiscordServerOptions {
    const client = context.application.discordInstance.getClient()
    const guildId = client.guilds.cache.first()?.id ?? '0'
    return { guildId }
  }

  public override createOptions(): ModalOption[] {
    return []
  }
}

export interface InDiscordServerOptions {
  guildId: string
  [key: string]: string | number | boolean | string[]
}
