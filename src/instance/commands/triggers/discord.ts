import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Discord extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['discord', 'dc'],
      description: "Returns a player's Discord social",
      example: `dc %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const mojangProfile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (mojangProfile == undefined) return usernameNotExists(context, givenUsername)

    const targetUser = await context.app.core.initializeMinecraftUser(mojangProfile, { guild: undefined })
    const discordProfile = targetUser.discordProfile()
    if (discordProfile !== undefined) {
      return `${mojangProfile.name} has linked to ${discordProfile.username} (${discordProfile.id})`
    }

    const player = await context.app.hypixelApi.getPlayer(mojangProfile.id, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const discordSocial = player.socialMedia.find((social) => social.id === 'DISCORD')
    if (discordSocial === undefined) {
      return `${mojangProfile.name} does not have Discord socials added to their Hypixel profile?`
    }

    return `${mojangProfile.name} social is probably: ${discordSocial.link}`
  }
}
