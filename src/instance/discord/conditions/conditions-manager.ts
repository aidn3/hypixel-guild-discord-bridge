import type { Client, Guild, GuildMember, GuildMemberEditOptions } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application'
import type { InstanceType } from '../../../common/application-event'
import type EventHelper from '../../../common/event-helper'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler'
import type { ConditionOption } from '../../../core/discord/user-conditions'
import type DiscordInstance from '../discord-instance'

import type { ConditionHandler, UpdateContext, UpdateGuildContext, UpdateMemberContext } from './common'
import { InGuild } from './handlers/in-guild'
import { Linked } from './handlers/linked'
import { SkyblockLevel } from './handlers/skyblock-level'
import { HandlersRegistry } from './handlers-registry'

export default class ConditionsManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private readonly bindingsRegistry: HandlersRegistry = new HandlersRegistry()

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.bindingsRegistry.registerHandler(new Linked())
    this.bindingsRegistry.registerHandler(new SkyblockLevel())
    this.bindingsRegistry.registerHandler(new InGuild())

    const client = clientInstance.getClient()
    client.on('guildDelete', (guild) => {
      if (!guild.available) return
      this.application.core.discordUserConditions.purgeGuildId(guild.id)
    })

    client.on('guildMemberRemove', (member) => {
      this.application.core.discordUserConditions.purgeDeletedUsers(member.guild.id, [member.user.id])
    })
  }

  public allHandlers(): ConditionHandler<ConditionOption>[] {
    return this.bindingsRegistry.allHandlers()
  }

  public async updateAllGuilds(context: UpdateContext): Promise<void> {
    const client = this.clientInstance.getClient()
    if (!client.isReady()) return

    const guilds = await client.guilds.fetch()
    context.progress.totalGuilds += guilds.size

    for (const guildRaw of guilds.values()) {
      this.logger.debug(`Updating members for guild ${guildRaw.id}`)
      const guild = await guildRaw.fetch()
      await this.updateGuild(context, guild)
    }
  }

  public async updateGuild(context: UpdateContext, guild: Guild): Promise<void> {
    if (context.abortSignal.aborted) return

    const conditions = context.application.core.discordUserConditions.getAllConditions(guild.id)
    const guildContext = {
      ...context,
      rolesConditions: conditions.roles,
      nicknameConditions: conditions.nicknames
    } satisfies UpdateGuildContext

    const allMembers = await guild.members.fetch()
    context.progress.totalUsers += allMembers.size

    for (const member of allMembers.values()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (context.abortSignal.aborted) return

      await this.updateMemberViaCache(guildContext, member)
    }

    context.progress.processedGuilds++
  }

  public async updateMember(context: UpdateContext, guildMember: GuildMember): Promise<void> {
    if (context.abortSignal.aborted) return

    const conditions = context.application.core.discordUserConditions.getAllConditions(guildMember.guild.id)
    const guildContext = {
      ...context,
      rolesConditions: conditions.roles,
      nicknameConditions: conditions.nicknames
    } satisfies UpdateGuildContext

    await this.updateMemberViaCache(guildContext, guildMember)
  }

  private async updateMemberViaCache(
    context: UpdateGuildContext,
    guildMember: GuildMember
  ): Promise<GuildMemberEditOptions | undefined> {
    if (context.abortSignal.aborted) return

    this.logger.debug(`Updating member ${guildMember.user.id} for guild ${guildMember.guild.id}`)
    const user = await this.application.core.initializeDiscordUser(
      this.clientInstance.profileByUser(guildMember.user, guildMember),
      { guild: guildMember.guild }
    )

    const memberContext = { ...context, member: guildMember, user: user } satisfies UpdateMemberContext

    const editOptions = await this.bindingsRegistry.updateMember(memberContext)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (context.abortSignal.aborted) return undefined

    if (editOptions !== undefined) {
      editOptions.reason = memberContext.updateReason
      this.logger.debug(
        `Updating member ${guildMember.user.id} for guild ${guildMember.guild.id} with reason: ${editOptions.reason}`
      )
      await guildMember.edit(editOptions)
      context.application.core.discordUserConditions.userUpdated(guildMember.guild.id, guildMember.user.id)
    }

    context.progress.processedUsers++
    return editOptions
  }
}
