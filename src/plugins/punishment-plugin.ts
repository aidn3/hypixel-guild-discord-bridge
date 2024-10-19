import type Application from '../application.js'
import type ClusterHelper from '../cluster-helper.js'
import { ChannelType, Severity, EventType, InstanceType, PunishmentType } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'
import { PunishedUsers } from '../util/punished-users.js'

/* WARNING
THIS IS AN ESSENTIAL PLUGIN! EDITING IT MAY HAVE ADVERSE AFFECTS ON THE APPLICATION
*/

// noinspection JSUnusedGlobalSymbols
export default {
  onRun(context: PluginContext): void {
    // context.application.on('instance',event => )
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    context.application.on('event', async (event) => {
      if (event.username == undefined) return
      switch (event.eventType) {
        case EventType.Unmute:
        case EventType.Join: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(
            context.application,
            context.application.punishedUsers,
            context.application.clusterHelper,
            event.username,
            identifiers
          )
          checkMuted(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
          break
        }
        case EventType.Mute:
        case EventType.Promote:
        case EventType.Demote:
        case EventType.Offline:
        case EventType.Online: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(
            context.application,
            context.application.punishedUsers,
            context.application.clusterHelper,
            event.username,
            identifiers
          )
        }
      }
    })
  }
} satisfies PluginInterface

function checkMuted(
  punishedUsers: PunishedUsers,
  clusterHelper: ClusterHelper,
  username: string,
  identifiers: string[]
): void {
  const mutedTill = punishedUsers.getPunishedTill(identifiers, PunishmentType.Mute)

  if (mutedTill) {
    clusterHelper.sendCommandToAllMinecraft(
      `/guild mute ${username} ${PunishedUsers.durationToMinecraftDuration(mutedTill - Date.now())}`
    )
  }
}

function checkBanned(
  application: Application,
  punishedUsers: PunishedUsers,
  clusterHelper: ClusterHelper,
  username: string,
  identifiers: string[]
): void {
  const bannedTill = punishedUsers.getPunishedTill(identifiers, PunishmentType.Ban)

  if (bannedTill) {
    application.emit('event', {
      localEvent: true,
      instanceType: InstanceType.Main,
      username: username,
      message: `Punishments-System tried to kick ${username} since they are banned.`,
      instanceName: InstanceType.Main,
      eventType: EventType.AUTOMATED,
      channelType: ChannelType.Officer,
      severity: Severity.Bad,
      removeLater: false
    })
  }
}
