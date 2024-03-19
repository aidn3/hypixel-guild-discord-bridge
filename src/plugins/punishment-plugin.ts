import type ClusterHelper from '../cluster-helper'
import { EventType, InstanceType, PunishmentType } from '../common/application-event'
import type { PluginContext, PluginInterface } from '../common/plugins'
import { PunishedUsers } from '../util/punished-users'

// noinspection JSUnusedGlobalSymbols
export default {
  onRun(context: PluginContext): void {
    // context.application.on('instance',event => )
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    context.application.on('event', async (event) => {
      if (event.username == undefined) return
      switch (event.name) {
        case EventType.UNMUTE:
        case EventType.JOIN: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
          checkBanned(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
          break
        }
        case EventType.MUTE:
        case EventType.PROMOTE:
        case EventType.DEMOTE:
        case EventType.OFFLINE:
        case EventType.ONLINE: {
          const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
          checkBanned(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
        }
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    context.application.on('chat', async (event) => {
      if (event.instanceType !== InstanceType.MINECRAFT) return
      const identifiers = await PunishedUsers.getMinecraftIdentifiers(context.application.mojangApi, event.username)
      checkBanned(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
      checkMuted(context.application.punishedUsers, context.application.clusterHelper, event.username, identifiers)
    })
  }
} satisfies PluginInterface

function checkMuted(
  punishedUsers: PunishedUsers,
  clusterHelper: ClusterHelper,
  username: string,
  identifiers: string[]
): void {
  const mutedTill = punishedUsers.getPunishedTill(identifiers, PunishmentType.MUTE)

  if (mutedTill) {
    clusterHelper.sendCommandToAllMinecraft(
      `/guild mute ${username} ${PunishedUsers.tillTimeToMinecraftDuration(mutedTill)}`
    )
  }
}

function checkBanned(
  punishedUsers: PunishedUsers,
  clusterHelper: ClusterHelper,
  username: string,
  identifiers: string[]
): void {
  const bannedTill = punishedUsers.getPunishedTill(identifiers, PunishmentType.BAN)

  if (bannedTill) {
    clusterHelper.sendCommandToAllMinecraft(`/guild kick ${username} Banned till ${new Date(bannedTill).toUTCString()}`)
  }
}
