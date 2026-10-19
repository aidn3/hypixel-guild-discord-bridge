import assert from 'node:assert'

import { PunishmentType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { MojangProfile } from '../../../common/user.js'
import { GuildInviteStatus } from '../../../instance/minecraft/guild-manager.js'
import { formatTime, searchObjects } from '../../../utility/shared-utility.js'
import type { Database, MinecraftGuild, WaitlistEntry } from '../database.js'

import { findInstanceByGuild } from './utlity.js'

export default class Invite extends ChatCommandHandler {
  constructor(private readonly database: Database) {
    super({
      type: ChatCommandGroup.General,
      id: 'invite',
      triggers: ['invite', 'guildinvite'],
      description: 'Send yourself a guild invite if you are officially invited',
      example: `invite`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const mojangProfile = context.message.user.mojangProfile()
    if (mojangProfile === undefined) return 'You can only this command in-game or when you are linked'

    const savedGuild = this.selectGuild(context, mojangProfile)
    if (typeof savedGuild === 'string') return savedGuild

    const punishments = context.message.user.activePunishments().longestPunishment(PunishmentType.Ban)
    if (punishments !== undefined) {
      return `You are banned till ${formatTime(punishments.till - Date.now())}.`
    }

    const instance = await findInstanceByGuild(context.app, savedGuild)
    if (instance === undefined) return 'Can not process this request right now due to inability to connect to Hypixel'

    const result = await instance.guildManager.invite(mojangProfile.name).catch(() => undefined)
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

  private selectGuild(context: ChatCommandContext, mojangProfile: MojangProfile): MinecraftGuild | string {
    const waitlistEntries = this.database.getWaitlistByMojangUuid(mojangProfile.id)
    if (waitlistEntries.length === 0) return 'You are not in the guild join waitlist'

    if (waitlistEntries.length === 1) {
      const waitlistEntry = waitlistEntries[0]
      const confirmStatus = this.confirmWaitlist(waitlistEntry)
      if (confirmStatus !== undefined) return confirmStatus

      const savedGuild = this.database.allGuilds().find((guild) => guild.id === waitlistEntry.guildId)
      assert.ok(savedGuild !== undefined)
      return savedGuild
    }

    const savedGuilds = this.database.allGuilds()
    const searchQuery = context.args
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' ')
    if (searchQuery.length === 0) {
      return `Must select a guild: ${savedGuilds.map((guild) => guild.name).join(', ')}`
    }
    const chosenGuild = searchObjects(searchQuery, savedGuilds, (guild) => guild.name).at(0)
    if (chosenGuild === undefined) {
      return `Must select a guild: ${savedGuilds.map((guild) => guild.name).join(', ')}`
    }

    return chosenGuild
  }

  private confirmWaitlist(waitlist: WaitlistEntry): string | undefined {
    const currentTime = Date.now()
    if (waitlist.noInviteTill > currentTime) {
      return (
        `You have rescheduled your invite.` +
        `\nYou will might get reconsidered again in ${formatTime(waitlist.noInviteTill - currentTime)}`
      )
    }

    if (waitlist.invitedTill === 0) {
      return `You are already on the waitlist but it is not your turn yet.`
    }

    if (waitlist.invitedTill < currentTime) {
      return 'You were invited but it expired. You need to join the waitlist again :('
    }

    // accepted
    return undefined
  }
}
