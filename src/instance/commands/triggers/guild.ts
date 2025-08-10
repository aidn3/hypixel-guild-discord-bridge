/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class Guild extends ChatCommandHandler {
  constructor() {
    super({
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

    let result = givenUsername
    result += ` in ${guild.name} (${guild.members.length}/125)`
    result += ` as ${member?.rank ?? 'unknown'}`
    if (member?.joinedAtTimestamp) {
      const duration = Date.now() - member.joinedAtTimestamp
      const days = Math.floor(duration / Duration.days(1).toMilliseconds())

      result += ` for the last `
      result += days > 0 ? `${days} days` : formatTime(duration)
    }
    if (member?.weeklyExperience) result += ` with GEXP this week ${member.weeklyExperience.toLocaleString('en-US')}`
    return result
  }
}
