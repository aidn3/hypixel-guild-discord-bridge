import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class GuildCheck extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['mguild', 'mguilds', 'massguilds', 'massguild', 'guilds', 'guildscheck', 'guildcheck'],
      description: 'Check multiple players guilds, if any in one',
      example: `mg %s ...`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.args.length === 0) return this.getExample(context.commandPrefix)

    const result: string[] = []
    for (const givenUsername of context.args) {
      const mojangProfile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
      if (mojangProfile === undefined) {
        result.push(`${givenUsername} invalid name`)
        continue
      }

      const guild = await context.app.hypixelApi.getGuild('player', mojangProfile.id, {}).catch(() => undefined)
      if (guild == undefined) {
        result.push(`${mojangProfile.name} not in guild`)
        continue
      }
      const member = guild.members.find((m: { uuid: string }) => m.uuid === mojangProfile.id)

      let entry = mojangProfile.name
      entry += ` in ${guild.name} (${guild.members.length}/125)`
      entry += ` as ${member?.rank ?? 'unknown'}`
      result.push(entry)
    }

    return result.join(' - ')
  }
}
