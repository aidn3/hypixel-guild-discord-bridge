import type Application from '../../../application.js'
import type { GuildPlayerEvent } from '../../../common/application-event.js'
import {
  ChannelType,
  Color,
  GuildPlayerEventType,
  InstanceType,
  PunishmentType
} from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type ModerationInstance from '../moderation-instance.js'
import { durationToMinecraftDuration } from '../util.js'

export default class PunishmentsEnforcer extends EventHandler<ModerationInstance> {
  private readonly application: Application

  constructor(application: Application, system: ModerationInstance) {
    super(system)

    this.application = application

    this.application.on('guildPlayer', (event) => {
      void this.onGuildPlayer(event).catch(this.clientInstance.errorHandler.promiseCatch('handling guildPlayer event'))
    })
  }

  private async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    switch (event.type) {
      case GuildPlayerEventType.Unmute:
      case GuildPlayerEventType.Join: {
        const identifiers = await this.clientInstance.getMinecraftIdentifiers(event.username)
        this.enforceBan(event.username, identifiers)
        this.enforceMute(event.username, identifiers)
        break
      }
      case GuildPlayerEventType.Mute:
      case GuildPlayerEventType.Promote:
      case GuildPlayerEventType.Demote:
      case GuildPlayerEventType.Offline:
      case GuildPlayerEventType.Online: {
        const identifiers = await this.clientInstance.getMinecraftIdentifiers(event.username)
        this.enforceBan(event.username, identifiers)
      }
    }
  }

  private enforceMute(username: string, identifiers: string[]): void {
    const mutedTill = this.clientInstance.punishments.punishedTill(identifiers, PunishmentType.Mute)

    if (mutedTill) {
      this.application.clusterHelper.sendCommandToAllMinecraft(
        `/guild mute ${username} ${durationToMinecraftDuration(mutedTill - Date.now())}`
      )
    }
  }

  private enforceBan(username: string, identifiers: string[]): void {
    const bannedTill = this.clientInstance.punishments.punishedTill(identifiers, PunishmentType.Ban)

    if (bannedTill) {
      this.application.emit('broadcast', {
        localEvent: true,

        instanceType: InstanceType.Moderation,
        instanceName: this.clientInstance.instanceName,

        channels: [ChannelType.Officer],
        color: Color.Bad,

        username: username,
        message: `Punishments-System tried to kick ${username} since they are banned.`
      })
    }
  }
}
