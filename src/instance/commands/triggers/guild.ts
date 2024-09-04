/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getUuidIfExists, usernameNotExists } from '../common/util.js'

export default class Guild extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Guild',
      triggers: ['guild', 'guildOf', 'g'],
      description: "Returns a player's guild, if they're in one",
      example: `g %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const guild = await context.app.hypixelApi.getGuild('player', uuid, {}).catch(() => {
      /* return undefined */
    })
    if (guild == undefined) return `${givenUsername} is not in a guild.`

    const member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    return `${givenUsername} in ${guild.name} (${guild.members.length}/125) as ${member?.rank ?? 'unknown'}`
  }
}
