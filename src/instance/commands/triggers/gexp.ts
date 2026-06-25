import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class Gexp extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['gexp', 'guildxp', 'guildexp'],
      description: 'Shows weekly and monthly GEXP for a guild member in this guild',
      example: 'gexp %s'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const guild = await context.app.hypixelApi.getGuildByPlayer(uuid)
    if (guild == undefined) return context.app.i18n.t(($) => $['commands.gexp.no-guild'], { username: givenUsername })

    const member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    assert.ok(member !== undefined)

    const days7 = Object.values(member.expHistory).reduce((a, b) => a + b, 0)
    const savedGexp = context.app.minecraftGuildsManager.getMemberGexp(guild._id, uuid, 90)

    const days30 = savedGexp
      .slice(0, 30)
      .map((entry) => entry.value)
      .reduce((a, b) => a + b, 0)
    const days90 = savedGexp
      .slice(0, 90)
      .map((entry) => entry.value)
      .reduce((a, b) => a + b, 0)

    if (days30 <= days7 && days90 <= days7) {
      return context.app.i18n.t(($) => $['commands.gexp.short-response'], {
        username: givenUsername,
        days7: days7
      })
    }

    return context.app.i18n.t(($) => $['commands.gexp.long-response'], {
      username: givenUsername,
      days7: days7,
      days30: days30,
      days90: days90
    })
  }
}
