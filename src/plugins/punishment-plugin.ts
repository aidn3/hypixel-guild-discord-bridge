import type Application from '../application.js'
import type ClusterHelper from '../cluster-helper.js'
import { ChannelType, Color, GuildPlayerEventType, InstanceType, PunishmentType } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'
import { PunishedUsers } from '../util/punished-users.js'
import { antiSpamString } from '../util/shared-util.js'

/* WARNING
THIS IS AN ESSENTIAL PLUGIN! EDITING IT MAY HAVE ADVERSE AFFECTS ON THE APPLICATION
*/

// noinspection JSUnusedGlobalSymbols
export default {
  onRun(context: PluginContext): void {
    // context.application.on('instance',event => )
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    context.application.on('guildPlayer', async (event) => {
      switch (event.type) {
        case GuildPlayerEventType.Unmute:
        case GuildPlayerEventType.Join: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(context, context.application.punishedUsers, event.username, identifiers)
          checkMuted(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
          break
        }
        case GuildPlayerEventType.Mute:
        case GuildPlayerEventType.Promote:
        case GuildPlayerEventType.Demote:
        case GuildPlayerEventType.Offline:
        case GuildPlayerEventType.Online: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(context, context.application.punishedUsers, event.username, identifiers)
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
  context: PluginContext,
  punishedUsers: PunishedUsers,
  username: string,
  identifiers: string[]
): void {
  const bannedTill = punishedUsers.getPunishedTill(identifiers, PunishmentType.Ban)

  if (bannedTill) {
    context.application.emit('pluginBroadcast', {
      localEvent: true,

      instanceType: InstanceType.Plugin,
      instanceName: context.pluginName,

      channel: ChannelType.Officer,
      color: Color.Bad,

      username: username,
      message: `Punishments-System tried to kick ${username} since they are banned.`
    })
  }
}
