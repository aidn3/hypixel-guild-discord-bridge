import type { Client, GuildMember } from 'discord.js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application'
import type { GuildPlayerEvent } from '../../common/application-event'
import { GuildPlayerEventType } from '../../common/application-event'
import type { DisplayableInstance } from '../../common/instance'
import { Instance } from '../../common/instance'
import { InGuild } from '../../core/conditions/handlers/in-guild'
import { InGuildAsGuildmaster } from '../../core/conditions/handlers/in-guild-as-guild-master'
import { InGuildWithGexp } from '../../core/conditions/handlers/in-guild-with-gexp'
import { InGuildWithRank } from '../../core/conditions/handlers/in-guild-with-rank'
import type { UpdateContext, UpdateMemberContext } from '../../instance/discord/conditions/common'

export class DiscordRoles extends Instance implements DisplayableInstance {
  private readonly singleton = new PromiseQueue(1)

  public constructor(application: Application) {
    super(application, 'auto-discord-roles')

    const client = this.discordClient()

    client.on('guildMemberAdd', (member) => {
      void this.singleton
        .add(() => this.onDiscordMemberJoin(member))
        .catch(this.errorHandler.promiseCatch('handling conditions for newly joined Discord member'))
    })

    this.application.on('guildPlayer', async (event) => {
      await this.singleton
        .add(() => this.onIngameMember(event))
        .catch(this.errorHandler.promiseCatch(`handling event in-game guild member ${event.type}`))
    })
  }

  public displayName(): string {
    return 'Discord Roles Manager'
  }

  public discordClient(): Client {
    return this.application.discordInstance.getClient()
  }

  private async onIngameMember(event: GuildPlayerEvent): Promise<void> {
    switch (event.type) {
      case GuildPlayerEventType.Demote:
      case GuildPlayerEventType.Promote:
      case GuildPlayerEventType.Join:
      case GuildPlayerEventType.Leave:
      case GuildPlayerEventType.Kick: {
        // allow through
        break
      }
      default: {
        return
      }
    }

    const user = event.user
    const discordProfile = user.discordProfile()
    if (discordProfile === undefined) return

    const client = this.discordClient()
    const allGuilds = await client.guilds.fetch()

    for (const guild of allGuilds.values()) {
      const guildId = guild.id
      const conditions = this.application.core.discordUserConditions.getAllConditions(guildId)
      const shouldUpdate = this.ingameGuildRelated([
        ...conditions.roles.map((condition) => condition.typeId),
        ...conditions.roles.map((condition) => condition.typeId)
      ])
      if (!shouldUpdate) continue

      const guildObject = await guild.fetch()
      const guildMember = await guildObject.members.fetch(discordProfile.id).catch(() => undefined)
      if (guildMember === undefined) continue

      const memberContext: UpdateMemberContext = { guildMember, user }
      const context: UpdateContext = {
        application: this.application,
        updateReason: event.message,
        startTime: guildMember.joinedTimestamp ?? Date.now(),
        abortSignal: this.abortController.signal,
        progress: {
          errors: [],
          processedGuilds: 0,
          processedNicknames: 0,
          processedRoles: 0,
          processedUsers: 0,
          totalUsers: 0,
          totalGuilds: 0
        }
      }

      await this.application.discordInstance.conditionsManager.updateMember(context, memberContext)
    }
  }

  private ingameGuildRelated(typeIds: string[]): boolean {
    const registry = this.application.core.conditonsRegistry

    for (const typeId of typeIds) {
      const handler = registry.get(typeId)
      if (handler === undefined) continue
      if (
        handler instanceof InGuild ||
        handler instanceof InGuildAsGuildmaster ||
        handler instanceof InGuildWithGexp ||
        handler instanceof InGuildWithRank
      ) {
        return true
      }
    }

    return false
  }

  private async onDiscordMemberJoin(guildMember: GuildMember): Promise<void> {
    const context: UpdateContext = {
      application: this.application,
      updateReason: 'Newly joined member',
      startTime: guildMember.joinedTimestamp ?? Date.now(),
      abortSignal: this.abortController.signal,
      progress: {
        errors: [],
        processedGuilds: 0,
        processedNicknames: 0,
        processedRoles: 0,
        processedUsers: 0,
        totalUsers: 0,
        totalGuilds: 0
      }
    }

    const profile = this.application.discordInstance.profileByUser(guildMember.user, guildMember)
    const user = await this.application.core.initializeDiscordUser(profile)
    const memberContext: UpdateMemberContext = { guildMember, user }
    await this.application.discordInstance.conditionsManager.updateMember(context, memberContext)
  }
}
