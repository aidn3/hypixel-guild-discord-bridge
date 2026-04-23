import assert from 'node:assert'

import { TTLCache } from '@isaacs/ttlcache'

import { ChannelType, InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandHandler } from '../../../common/commands'
import type { MinecraftUser, MojangProfile } from '../../../common/user'
import { usernameNotExists } from '../../../instance/commands/common/utility'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'
import type { Database } from '../database'

import { resolveGuildRank } from './utlity'

export default class Sync extends ChatCommandHandler {
  private readonly cooldowns = new TTLCache<MojangProfile['id'], { createdAt: number }>({
    ttl: Duration.minutes(5).toMilliseconds()
  })
  private static readonly Cooldown = Duration.minutes(5)

  constructor(private readonly database: Database) {
    super({
      triggers: ['sync', 'rankup', 'guildrankup', 'grankup'],
      description: 'Update a user in-game guild rank',
      example: `sync [username]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public && context.message.channelType !== ChannelType.Officer) {
      return 'Command can only be used in public and officer channels.'
    }

    const currentTime = Date.now()
    const target = await this.resolveUser(context)
    if (typeof target === 'string') return target
    const targetProfile = target.mojangProfile()

    if ((await context.message.user.permission()) === Permission.Anyone) {
      const identifier = context.message.user.getUserIdentifier()
      const id = `${identifier.originInstance}:${identifier.userId}`
      const cooldownResult = this.cooldowns.get(id)
      if (cooldownResult !== undefined && cooldownResult.createdAt + Sync.Cooldown.toMilliseconds() > currentTime) {
        const againIn = cooldownResult.createdAt + Sync.Cooldown.toMilliseconds() - currentTime
        return `${context.username}, you can use this command again in ${formatTime(againIn)}.`
      } else {
        this.cooldowns.set(id, { createdAt: currentTime })
      }
    }

    const guild = await context.app.hypixelApi.getGuildByPlayer(targetProfile.id, currentTime)
    if (guild === undefined) return `${targetProfile.name} is not in a guild.`
    const guildMember = guild.members.find((member) => member.uuid === targetProfile.id)
    assert.ok(guildMember !== undefined)

    const savedGuild = this.database.allGuilds().find((savedGuild) => savedGuild.id === guild._id)
    if (savedGuild === undefined) return `${targetProfile.name} is in an outside guild: ${guild.name}.`

    const resolvedRank = await resolveGuildRank(
      context,
      this.database,
      currentTime,
      savedGuild,
      guild,
      guildMember,
      target
    )
    if (resolvedRank === 'not-whitelisted') {
      return `${targetProfile.name} current rank ${guildMember.rank ?? 'Member'} is not whitelisted to be changed.`
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

  private async resolveUser(context: ChatCommandContext): Promise<MinecraftUser | string> {
    const givenUsername = context.args.at(0)
    const originUser = context.message.user

    if (givenUsername === undefined) {
      if (!originUser.isMojangUser()) {
        return 'Can not find your Mojang profile. Do `/link` before trying again'
      }

      return originUser
    }

    if (givenUsername.toLowerCase() === originUser.mojangProfile()?.name.toLowerCase()) {
      assert.ok(originUser.isMojangUser())
      return originUser
    }

    const permission = await originUser.permission()
    if (permission === Permission.Anyone) return 'You can only use this command on yourself unless you are staff!'

    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile === undefined) return usernameNotExists(context, givenUsername)
    return await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
  }
}
