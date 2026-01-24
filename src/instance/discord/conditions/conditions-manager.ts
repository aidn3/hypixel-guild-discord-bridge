import type { Client, Guild, GuildMemberEditOptions } from 'discord.js'
import { DiscordAPIError, DiscordjsError, DiscordjsErrorCodes, userMention } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application'
import type { InstanceType } from '../../../common/application-event'
import type EventHelper from '../../../common/event-helper'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler'
import { OnUnmet } from '../../../core/conditions/common'
import { CanNotResolve } from '../../../core/placeholder/common'
import type DiscordInstance from '../discord-instance'

import type { UpdateContext, UpdateGuildContext, UpdateMemberContext } from './common'

export default class ConditionsManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    const client = clientInstance.getClient()
    client.on('guildDelete', (guild) => {
      if (!guild.available) return
      this.application.core.discordUserConditions.purgeGuildId(guild.id)
    })

    client.on('guildMemberRemove', (member) => {
      this.application.core.discordUserConditions.purgeDeletedUsers(member.guild.id, [member.user.id])
    })
  }

  public async updateGuild(context: UpdateContext, guild: Guild): Promise<void> {
    if (context.abortSignal.aborted) return

    const conditions = context.application.core.discordUserConditions.getAllConditions(guild.id)
    const guildContext = {
      ...context,
      conditionsRegistry: context.application.core.conditonsRegistry,
      placeholderManager: context.application.core.placeHolder,
      rolesConditions: conditions.roles,
      nicknameConditions: conditions.nicknames
    } satisfies UpdateGuildContext

    const allMembers = await guild.members.fetch()
    context.progress.totalUsers += allMembers.size

    for (const guildMember of allMembers.values()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (context.abortSignal.aborted) return

      const user = await this.application.core.initializeDiscordUser(
        this.clientInstance.profileByUser(guildMember.user, guildMember),
        { guild: guild }
      )
      try {
        await this.updateMemberViaCache(guildContext, { guildMember, user })
      } catch (error: unknown) {
        if (error instanceof DiscordAPIError && error.code === 50_013) {
          context.progress.errors.push(`Failed updating user ${guildMember.id} due to missing permissions`)
        }
      }
    }

    context.progress.processedGuilds++
  }

  public async updateMember(context: UpdateContext, member: UpdateMemberContext): Promise<void> {
    if (context.abortSignal.aborted) return

    const conditions = context.application.core.discordUserConditions.getAllConditions(member.guildMember.guild.id)
    const guildContext = {
      ...context,
      conditionsRegistry: context.application.core.conditonsRegistry,
      placeholderManager: context.application.core.placeHolder,
      rolesConditions: conditions.roles,
      nicknameConditions: conditions.nicknames
    } satisfies UpdateGuildContext

    try {
      await this.updateMemberViaCache(guildContext, member)
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError && error.code === 50_013) {
        context.progress.errors.push(
          `Failed updating user ${userMention(member.guildMember.id)} due to missing permissions`
        )
      } else {
        throw error
      }
    }
  }

  private async updateMemberViaCache(
    context: UpdateGuildContext,
    memberContext: UpdateMemberContext
  ): Promise<GuildMemberEditOptions | undefined> {
    if (context.abortSignal.aborted) return

    const guildMember = memberContext.guildMember
    this.logger.debug(`Updating member ${guildMember.user.id} for guild ${guildMember.guild.id}`)

    const editOptions = await this.resolveMemberUpdate(context, memberContext)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (context.abortSignal.aborted) return undefined

    if (editOptions !== undefined) {
      editOptions.reason = context.updateReason
      this.logger.debug(
        `Updating member ${guildMember.user.id} for guild ${userMention(guildMember.guild.id)} with reason: ${editOptions.reason}`
      )
      await guildMember.edit(editOptions)
      context.application.core.discordUserConditions.userUpdated(guildMember.guild.id, guildMember.user.id)
    }

    context.progress.processedUsers++
    return editOptions
  }

  /**
   * Resolve what to update in a guild member.
   * Note if {@link context#abortSignal} is aborted, <code>undefined</code> is returned.
   */
  private async resolveMemberUpdate(
    context: UpdateGuildContext,
    memberContext: UpdateMemberContext
  ): Promise<GuildMemberEditOptions | undefined> {
    if (context.abortSignal.aborted) return undefined

    const editOptions: GuildMemberEditOptions = {}
    await this.updateRoles(context, memberContext, editOptions)
    await this.updateMemberNicknames(context, memberContext, editOptions)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (context.abortSignal.aborted) return undefined
    return Object.keys(editOptions).length > 0 ? editOptions : undefined
  }

  private async updateRoles(
    context: Readonly<UpdateGuildContext>,
    memberContext: UpdateMemberContext,
    editPayload: GuildMemberEditOptions
  ): Promise<void> {
    const assignedRoles = new Set<string>(memberContext.guildMember.roles.cache.keys())
    let changed = false

    for (const condition of context.rolesConditions) {
      if (context.abortSignal.aborted) return undefined
      context.progress.processedRoles++

      const handler = context.conditionsRegistry.get(condition.typeId)
      if (handler === undefined) throw new Error(`handler id ${condition.typeId} not found.`)

      let meetsCondition: boolean
      try {
        meetsCondition = await handler.meetsCondition(context, memberContext, condition.options)
      } catch {
        meetsCondition = false
      }

      const assignedRolesSize = assignedRoles.size
      if (meetsCondition) {
        assignedRoles.add(condition.roleId)
      } else if (condition.onUnmet === OnUnmet.Remove) {
        assignedRoles.delete(condition.roleId)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (condition.onUnmet === OnUnmet.Keep) {
        // do nothing
      } else {
        condition.onUnmet satisfies never
      }

      if (assignedRolesSize !== assignedRoles.size) {
        changed = true
      }
    }

    if (changed) editPayload.roles = [...assignedRoles]
  }

  private async updateMemberNicknames(
    context: Readonly<UpdateGuildContext>,
    memberContext: UpdateMemberContext,
    editPayload: GuildMemberEditOptions
  ): Promise<void> {
    const cache = new Map<string, string>()
    const custom = {}
    for (const condition of context.nicknameConditions) {
      if (context.abortSignal.aborted) return undefined
      context.progress.processedNicknames++

      const handler = context.conditionsRegistry.get(condition.typeId)
      if (handler === undefined) throw new Error(`handler id ${condition.typeId} not found.`)

      let meetsCondition: boolean
      try {
        meetsCondition = await handler.meetsCondition(context, memberContext, condition.options)
      } catch {
        meetsCondition = false
      }

      if (meetsCondition) {
        try {
          editPayload.nick = await context.placeholderManager.resolvePlaceholder(
            {
              cachedPlaceholders: cache,
              customPlaceholders: custom,
              throwOnAnyFail: false,
              user: memberContext.user,
              application: context.application,
              startTime: context.startTime
            },
            condition.nickname
          )
        } catch (error: unknown) {
          if (!(error instanceof CanNotResolve)) {
            // TODO: show an error maybe?
          }
        }
      }
    }
  }
}
