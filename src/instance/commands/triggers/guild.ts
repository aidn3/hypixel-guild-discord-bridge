/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import assert from 'node:assert'

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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const guild = await context.app.hypixelApi.getGuildByPlayer(uuid)
    if (guild == undefined) return `${givenUsername} is not in a guild.`

    const member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    assert.ok(member !== undefined)

    let result = givenUsername
    result += ` in ${guild.name} (${guild.members.length}/125)`
    result += ` as ${member.rank ?? 'unknown'}`

    const duration = Date.now() - member.joined
    const days = Math.floor(duration / Duration.days(1).toMilliseconds())
    result += ` for the last `
    result += days > 0 ? `${days} days` : formatTime(duration)

    result += ` with GEXP this week ${Object.values(member.expHistory)
      .reduce((a, b) => a + b, 0)
      .toLocaleString('en-US')}`
    return result
  }
}
