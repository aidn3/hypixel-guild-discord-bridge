import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Mayor extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['mayor', 'm', 'derpy', 'jerry', 'scorpius'],
      description: 'Show current Hypixel Skyblock Election',
      example: `mayor`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const government = await context.app.hypixelApi.getSkyblockGovernment({ raw: true })

    let message = `Elected Mayor: `
    message += `${government.mayor.name} (${government.mayor.perks.map((perk) => perk.name).join(', ')})`
    if (government.mayor.minister !== undefined) {
      message += ' | '
      message += `${government.mayor.minister.name} (${government.mayor.minister.perk.name})`
    }
    return message
  }
}
