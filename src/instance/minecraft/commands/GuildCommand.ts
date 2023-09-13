/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mojang = require('mojang')

export default {
  triggers: ['guild', 'guildOf', 'g'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] != null ? args[0] : username
    const uuid = await mojang.lookupProfileAt(givenUsername).then((p: { id: any }) => p.id)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const guild = await clientInstance.app.hypixelApi.getGuild('player', uuid, {})
    // TODO: make sure no guild works
    if (guild == null) return `${givenUsername} is not in any guild.`

    const member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    return `${givenUsername} in ${guild.name} (${guild.members.length}/125) as ${member?.rank ?? 'unknown'}`
  }
} satisfies MinecraftCommandMessage
