import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Mayor extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['mayor', 'm'],
      description: 'Show current Hypixel Skyblock Election',
      example: `mayor`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    // TODO: @Kathund rewrite the response from getSkyblockElection coz it's FUCKING SHIT AND I HATE IT AHGUY8FGYUDYFHUGUHFGDHUIDIHJNUVB
    const government = await context.app.hypixelApi.getSkyBlockElection()
    if (government.isRaw())
      throw new Error("Something wen't wrong while fetching the government of skyblock. Clearly kathund is the mayor")

    const mayor = government.lastElectionResults.candidates[0]

    let message = `Elected Mayor: `
    message += `${mayor.name} (${mayor.perks.map((perk) => perk.name).join(', ')})`
    return message
  }
}
