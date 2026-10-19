import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { hypixelApiNotSet } from '../common/utility.js'

export default class Mayor extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'skyblock-mayor',
      triggers: ['mayor', 'm'],
      description: 'Show current Hypixel SkyBlock mayor and minister',
      example: `mayor`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const government = await hypixel.getSkyblockElection()

    let message = `Elected Mayor: `
    message += `${government.mayor.name} (${government.mayor.perks.map((perk) => perk.name).join(', ')})`
    if (government.mayor.minister !== undefined) {
      message += ' | '
      message += `${government.mayor.minister.name} (${government.mayor.minister.perk.name})`
    }
    return message
  }
}
