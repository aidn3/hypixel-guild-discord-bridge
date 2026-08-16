import type { Client, GuildMember } from 'discord.js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application.js'
import type { GuildPlayerEvent } from '../../common/application-event.js'
import { GuildPlayerEventType } from '../../common/application-event.js'
import type { DisplayableInstance } from '../../common/instance.js'
import { Instance } from '../../common/instance.js'
import { InGuildAsGuildmaster } from '../../core/conditions/handlers/in-guild-as-guild-master.js'
import { InGuildWithGexp } from '../../core/conditions/handlers/in-guild-with-gexp.js'
import { InGuildWithRank } from '../../core/conditions/handlers/in-guild-with-rank.js'
import { InGuild } from '../../core/conditions/handlers/in-guild.js'
import type { UpdateContext, UpdateMemberContext } from '../../instance/discord/conditions/common.js'
import Duration from '../../utility/duration.js'
import { sleep } from '../../utility/shared-utility.js'

export class DiscordRoles extends Instance implements DisplayableInstance {
  private static readonly IngameWait = Duration.seconds(30)
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
      this.logger.debug(`Preparing to update user ${user.displayName()} in guild id ${guild.id}`)

      const currentTime = Date.now()
      const timeToWait = event.createdAt - currentTime + DiscordRoles.IngameWait.toMilliseconds()
      if (timeToWait > 0) {
        this.logger.debug(
          `Awaiting an additional ${timeToWait} for API changes to take effect before attempting any read`
        )
        await sleep(timeToWait)
      }

      const memberContext: UpdateMemberContext = { guildMember, user }
      const context: UpdateContext = {
        application: this.application,
        updateReason: event.message,
        startTime: Date.now(), // we awaited additional time over currentTime to give the API a chance to update,
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

      this.logger.debug(`Updating user ${user.displayName()} in guild id ${guild.id}`)
      await this.application.discordInstance.conditionsManager.updateMember(context, memberContext)
      this.logger.debug(`Finished updating user ${user.displayName()} in guild id ${guild.id}`)
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
