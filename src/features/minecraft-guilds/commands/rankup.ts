import assert from 'node:assert'

import { ChannelType, InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandHandler } from '../../../common/commands'
import type { MojangProfile, User } from '../../../common/user'
import type { HypixelGuild, HypixelGuildMember } from '../../../core/hypixel/hypixel-guild'
import { usernameNotExists } from '../../../instance/commands/common/utility'
import type { Database, MinecraftGuild, MinecraftGuildRole } from '../database'

export default class Rankup extends ChatCommandHandler {
  constructor(private readonly database: Database) {
    super({
      triggers: ['rankup', 'guildrankup', 'grankup'],
      description: 'Update a user in-game guild rank',
      example: `rankup [username]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public && context.message.channelType !== ChannelType.Officer) {
      return 'Command can only be used in public and officer channels.'
    }

    const target = await this.resolveUser(context)
    if (typeof target === 'string') return target
    const targetUser = target.user
    const targetProfile = target.profile

    const guild = await context.app.hypixelApi.getGuildByPlayer(targetProfile.id)
    if (guild === undefined) return `${targetProfile.name} is not in a guild.`
    const guildMember = guild.members.find((member) => member.uuid === targetProfile.id)
    assert.ok(guildMember !== undefined)

    const savedGuild = this.database.allGuilds().find((guild) => guild.id === guild.id)
    if (savedGuild === undefined) return `${targetProfile.name} is in an outside guild: ${guild.name}.`

    const resolvedRank = await this.resolveRank(context, savedGuild, guild, guildMember, targetUser, targetProfile)
    if (resolvedRank === 'not-whitelisted') {
      return `${targetUser.displayName()} current rank ${guildMember.rank ?? 'Member'} is not whitelisted to be changed.`
    } else if (resolvedRank === 'no-condition') {
      return `Guild ${guild.name} does not have any condition set to evaluate.`
    }

    if (resolvedRank === 'no-rank') {
      const defaultRank = guild.ranks.find((rank) => rank.default)?.name
      assert.ok(defaultRank !== undefined)
      if (guildMember.rank !== undefined && guildMember.rank === defaultRank) {
        return `${targetProfile.name} already at the lowest rank.`
      }

      await this.setRank(context, targetProfile.id, defaultRank)
      return `${targetProfile.name} does not meet any of the higher ranks requirements.`
    }

    if (guildMember.rank === undefined || guildMember.rank !== resolvedRank.rank) {
      await this.setRank(context, targetProfile.id, resolvedRank.rank)
    }

    return `${targetProfile.name}: ${resolvedRank.rank} - ${resolvedRank.condition}`
  }

  private async setRank(context: ChatCommandContext, uuid: string, rank: string): Promise<void> {
    await context.app.sendMinecraft(
      context.app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild setrank ${uuid} ${rank}`
    )
  }

  private async resolveUser(context: ChatCommandContext): Promise<{ user: User; profile: MojangProfile } | string> {
    const givenUsername = context.args.at(0)
    const originUser = context.message.user
    const originMojangProfile = originUser.mojangProfile()

    if (givenUsername === undefined) {
      if (originMojangProfile === undefined) {
        return 'Can not find your Mojang profile. Do `/link` before trying again'
      }

      return { user: originUser, profile: originMojangProfile }
    }

    if (givenUsername.toLowerCase() === originMojangProfile?.name.toLowerCase()) {
      return { user: originUser, profile: originMojangProfile }
    }

    const permission = await originUser.permission()
    if (permission === Permission.Anyone) return 'You can only use this command on yourself unless you are staff!'

    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile === undefined) return usernameNotExists(context, givenUsername)
    const targetUser = await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
    return { user: targetUser, profile: profile }
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
