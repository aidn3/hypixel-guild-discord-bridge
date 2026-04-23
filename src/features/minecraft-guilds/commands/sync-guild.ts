import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import { ChannelType, InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandHandler } from '../../../common/commands'
import type { MinecraftUser } from '../../../common/user'
import { searchObjects } from '../../../utility/shared-utility'
import type { Database, MinecraftGuild } from '../database'

import { resolveGuildRank } from './utlity'

export default class SyncGuild extends ChatCommandHandler {
  private readonly singleton = new PromiseQueue(1)

  constructor(private readonly database: Database) {
    super({
      triggers: ['sync-guild', 'mass-sync', 'guild-sync'],
      description: 'Update ranks of all members in a guild',
      example: `sync-guild [GuildName]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public && context.message.channelType !== ChannelType.Officer) {
      return 'Command can only be used in public and officer channels.'
    }

    const permission = await context.message.user.permission()
    if (permission < Permission.Officer) return 'Only staff can use this command!'

    const savedGuilds = this.database.allGuilds()
    if (savedGuilds.length === 0) return `${context.username}, no guild registered.`

    if (this.singleton.getPendingLength() > 0 || this.singleton.getQueueLength() > 0) {
      return `${context.username}, command is already running.`
    }

    return await this.singleton.add(() => this.tryResolveAndSync(context, savedGuilds))
  }

  private async tryResolveAndSync(context: ChatCommandContext, savedGuilds: MinecraftGuild[]): Promise<string> {
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

    let changed = 0
    let already = 0
    let skipped = 0
    for (const guildMember of guild.members) {
      const target = await this.resolveUser(context, guildMember.uuid)
      if (typeof target === 'string') continue

      const resolvedRank = await resolveGuildRank(context, this.database, savedGuild, guild, guildMember, target)
      if (resolvedRank === 'not-whitelisted' || resolvedRank === 'no-condition') {
        skipped++
        continue
      }

      if (resolvedRank === 'no-rank') {
        const defaultRank = guild.ranks.find((rank) => rank.default)?.name
        assert.ok(defaultRank !== undefined)
        if (guildMember.rank !== undefined && guildMember.rank === defaultRank) {
          already++
          continue
        }

        await this.setRank(context, target.mojangProfile().id, defaultRank)
        changed++
        continue
      }

      if (guildMember.rank === undefined || guildMember.rank !== resolvedRank.rank) {
        await this.setRank(context, target.mojangProfile().id, resolvedRank.rank)
        changed++
      } else {
        already++
      }
    }

    return `Synced ${savedGuild.name}: Changed ${changed} - Already ${already} - Skipped ${skipped}`
  }

  private async setRank(context: ChatCommandContext, uuid: string, rank: string): Promise<void> {
    await context.app.sendMinecraft(
      context.app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild setrank ${uuid} ${rank}`
    )
  }

  private async resolveUser(context: ChatCommandContext, uuid: string): Promise<MinecraftUser | string> {
    const profile = await context.app.mojangApi.profileByUuid(uuid).catch(() => undefined)
    if (profile === undefined) return `Couldn't find player with uuid ${uuid}`

    return await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
  }
}
