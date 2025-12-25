import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class GuildExperience extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['guildexp', 'gexp'],
      description: 'Weekly guild experience of specified user.',
      example: `guildexp %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const guild = await context.app.hypixelApi.getGuild('player', uuid, {}).catch(() => undefined)
    if (!guild) return `${givenUsername} is not in a guild.`

    const member = guild.members.find((entry) => entry.uuid === uuid)
    if (!member) return `${givenUsername} is not in a guild.`

    const weeklyExperience = member.weeklyExperience ?? 0
    return `${givenUsername}'s Weekly Guild Experience: ${weeklyExperience.toLocaleString('en-US')}.`
  }
}
