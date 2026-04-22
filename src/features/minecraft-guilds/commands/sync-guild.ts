import assert from 'node:assert'

import { ChannelType, InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandHandler } from '../../../common/commands'
import type { MojangProfile, User } from '../../../common/user'
import type { HypixelGuild, HypixelGuildMember } from '../../../core/hypixel/hypixel-guild'
import { searchObjects } from '../../../utility/shared-utility'
import type { Database, MinecraftGuild, MinecraftGuildRole } from '../database'

export default class SyncGuild extends ChatCommandHandler {
  constructor(private readonly database: Database) {
    super({
      triggers: ['sync-guild'],
      description: 'Update ranks of all members in a guild',
      example: `sync [GuildName]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public && context.message.channelType !== ChannelType.Officer) {
      return 'Command can only be used in public and officer channels.'
    }

    const permission = await context.message.user.permission()
    if (permission === Permission.Anyone) return 'Only staff can use this command!'

    const savedGuilds = this.database.allGuilds()
    if (savedGuilds.length === 0) return `${context.username}, no guild not registered.`

    if (savedGuilds.length === 1) {
      const savedGuild = savedGuilds[0]
      return this.syncGuild(context, savedGuild)
    }

    const query = context.args
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' ')

    if (query.length === 0) {
      return `${context.username}, need to select a guild: ${savedGuilds.map((guild) => guild.name).join(', ')}`
    }

    const savedGuild = searchObjects(query, savedGuilds, (guild) => guild.name).at(0)
    if (savedGuild !== undefined) {
      return this.syncGuild(context, savedGuild)
    }

    return `${context.username}, unknown guild: ${query}`
  }

  private async syncGuild(context: ChatCommandContext, savedGuild: MinecraftGuild): Promise<string> {
    const guild = await context.app.hypixelApi.getGuildById(savedGuild.id)
    if (guild === undefined) return `Unknown guild ${savedGuild.name}.`

    for (const guildMember of guild.members) {
      const target = await this.resolveUser(context, guildMember.uuid)

      if (typeof target === 'string') continue
      const targetUser = target.user
      const targetProfile = target.profile

      const savedGuild = this.database.allGuilds().find((savedGuild) => savedGuild.id === guild._id)
      if (savedGuild === undefined) {
        continue
      }

      const resolvedRank = await this.resolveRank(context, savedGuild, guild, guildMember, targetUser, targetProfile)
      if (resolvedRank === 'not-whitelisted') {
        continue
      } else if (resolvedRank === 'no-condition') {
        continue
      }

      if (resolvedRank === 'no-rank') {
        const defaultRank = guild.ranks.find((rank) => rank.default)?.name
        assert.ok(defaultRank !== undefined)
        if (guildMember.rank !== undefined && guildMember.rank === defaultRank) {
          continue
        }

        await this.setRank(context, targetProfile.id, defaultRank)
        continue
      }

      if (guildMember.rank === undefined || guildMember.rank !== resolvedRank.rank) {
        await this.setRank(context, targetProfile.id, resolvedRank.rank)
      }
    }

    return `Synced the guild ${savedGuild.name}`
  }

  private async setRank(context: ChatCommandContext, uuid: string, rank: string): Promise<void> {
    await context.app.sendMinecraft(
      context.app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild setrank ${uuid} ${rank}`
    )
  }

  private async resolveUser(
    context: ChatCommandContext,
    uuid: string
  ): Promise<{ user: User; profile: MojangProfile } | string> {
    const profile = await context.app.mojangApi.profileByUuid(uuid).catch(() => undefined)
    if (profile === undefined) return `Couldn't find player with uuid ${uuid}`

    const targetUser = await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
    return { user: targetUser, profile: profile }

    /*
    const userLink = await context.app.core.verification.findByIngame(uuid)
    if (userLink === undefined) return `Player ${uuid} is not linked to any account.`

    const discordUser = await context.app.core.initializeDiscordUser({ type: 'raw', id: userLink.discordId }, {})

    const mojangProfile = discordUser.mojangProfile()
    if (mojangProfile === undefined) {
      return `User ${discordUser.getUserIdentifier().userId} is not linked to any Minecraft account, which is weird, because that's how I found the user.`
    }

    return { user: discordUser, profile: mojangProfile }
    */
  }

  private async resolveRank(
    context: ChatCommandContext,
    savedGuild: MinecraftGuild,
    guild: HypixelGuild,
    guildMember: HypixelGuildMember,
    targetUser: User,
    mojangProfile: MojangProfile
  ): Promise<{ rank: string; condition: string } | 'not-whitelisted' | 'no-rank' | 'no-condition'> {
    assert.ok(targetUser.mojangProfile() !== undefined)
    assert.strictEqual(guildMember.uuid, mojangProfile.id)
    assert.strictEqual(guildMember.uuid, targetUser.mojangProfile()?.id)

    // check if the current rank is default OR explicitly whitelisted to be changed
    // default rank is a special rank that is made as a fallback for other ranks
    const defaultRank = guild.ranks.find((rank) => rank.default)?.name
    assert.ok(defaultRank !== undefined)
    if (guildMember.rank !== undefined && guildMember.rank !== defaultRank) {
      const currentSavedRank = savedGuild.roles.find((role) =>
        guild.ranks.some((guildRank) => guildRank.name === role.name)
      )
      if (!currentSavedRank?.whitelisted) {
        return 'not-whitelisted'
      }
    }

    const sortedRanks = guild.ranks.toSorted((a, b) => a.priority - b.priority)
    const whitelistedRoles: MinecraftGuildRole[] = []
    for (const sortedRank of sortedRanks) {
      const whitelistedRole = savedGuild.roles.find((role) => role.name === sortedRank.name)
      if (whitelistedRole !== undefined) whitelistedRoles.push(whitelistedRole)
    }

    const registry = context.app.core.conditonsRegistry
    const roleConditions = this.database.getRoleConditions(savedGuild.id)
    const conditionContext = {
      application: context.app,
      startTime: Date.now(),
      abortSignal: new AbortController().signal
    }

    if (roleConditions.length === 0) {
      return 'no-condition'
    }

    for (const whitelistedRole of whitelistedRoles.toReversed()) {
      for (const roleCondition of roleConditions) {
        if (whitelistedRole.name !== roleCondition.role) continue
        const handler = registry.get(roleCondition.typeId)
        if (handler === undefined) continue
        const meetsCondition = await handler.meetsCondition(
          conditionContext,
          { user: targetUser },
          roleCondition.options
        )
        if (meetsCondition) {
          const display = await handler.displayCondition(
            { ...conditionContext, discordGuild: undefined },
            roleCondition.options
          )
          return { rank: whitelistedRole.name, condition: display }
        }
      }
    }

    return 'no-rank'
  }
}
