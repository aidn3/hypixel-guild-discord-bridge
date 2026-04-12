import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandHandler } from '../../../common/commands'
import { Status } from '../../../common/connectable-instance'
import type { GuildManager } from '../../../core/users/guild-manager'
import { GuildInviteStatus } from '../../../core/users/guild-manager'
import type MinecraftInstance from '../../../instance/minecraft/minecraft-instance'
import type { MinecraftManager } from '../../../instance/minecraft/minecraft-manager'
import Duration from '../../../utility/duration'
import type { Database, MinecraftGuild } from '../database'

export default class Invite extends ChatCommandHandler {
  constructor(private readonly database: Database) {
    super({
      triggers: ['invite', 'guildinvite'],
      description: 'Send yourself a guild invite if you are officially invited',
      example: `invite`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const mojangProfile = context.message.user.mojangProfile()
    if (mojangProfile === undefined) return 'You can only this command in-game or when you are linked'

    const waitlistEntry = this.database.getWaitlistByMojangId(mojangProfile.id)
    if (waitlistEntry === undefined) return 'You are not in the guild join waitlist'

    const savedGuild = this.database.allGuilds().find((guild) => guild.id === waitlistEntry.guildId)
    assert.ok(savedGuild !== undefined)

    const instance = await this.findInstance(savedGuild, context.app.minecraftManager, context.app.core.guildManager)
    if (instance === undefined) return 'Can not process this request right now due to inability to connect to Hypixel'

    const result = await context.app.core.guildManager
      .invite(instance.instanceName, mojangProfile.name)
      .catch(() => undefined)
    if (result === undefined) return 'Failed to invite somehow :D'

    switch (result) {
      case GuildInviteStatus.AlreadyJoined: {
        return 'You already joined the guild!'
      }
      case GuildInviteStatus.Joined: {
        return 'Joined the guild!'
      }

      case GuildInviteStatus.AlreadyInvited: {
        return 'Already invited!'
      }
      case GuildInviteStatus.OnlineInvite:
      case GuildInviteStatus.OfflineInvite: {
        return 'Sent an invite.'
      }

      case GuildInviteStatus.AlreadyInGuild: {
        return 'Leave your current guild to get invited.'
      }
      case GuildInviteStatus.GuildFull: {
        return 'Guild already full. Ask staff for help.'
      }
      case GuildInviteStatus.NoPermission: {
        return 'No permission to invite you. Ask staff for help.'
      }
      case GuildInviteStatus.PlayerPrivate: {
        return 'Change your social settings to allow guild invite from anyone.'
      }

      case GuildInviteStatus.InvalidUsername: {
        return 'Did you change your username or delete your Minecraft account? Can not send you an invite.'
      }

      default: {
        result satisfies never
        return 'Something went wrong. Ask guild admin for help.'
      }
    }
  }

  async findInstance(
    savedGuild: MinecraftGuild,
    minecraftManager: MinecraftManager,
    guildManager: GuildManager
  ): Promise<MinecraftInstance | undefined> {
    for (const potentialInstance of minecraftManager.getAllInstances()) {
      if (potentialInstance.currentStatus() !== Status.Connected) continue

      const guildListResult = await guildManager
        .list(potentialInstance.instanceName, Duration.minutes(5))
        .catch(() => undefined)
      if (guildListResult === undefined) continue

      if (guildListResult.name.trim().toLowerCase() === savedGuild.name.trim().toLowerCase()) {
        return potentialInstance
      }
    }

    return undefined
  }
}
