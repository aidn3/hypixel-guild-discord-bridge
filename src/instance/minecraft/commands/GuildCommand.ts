/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

export default {
  triggers: ['guild', 'guildOf', 'g'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] ?? username

    const uuid = await clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((p) => p.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const guild = await clientInstance.app.hypixelApi.getGuild('player', uuid, {})
    // TODO: make sure no guild works
    if (guild == null) return `${givenUsername} is not in a guild.`

    const member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    return `${givenUsername} in ${guild.name} (${guild.members.length}/125) as ${member?.rank ?? 'unknown'}`
  }
} satisfies MinecraftCommandMessage
