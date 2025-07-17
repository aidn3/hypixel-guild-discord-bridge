import { ChatCommandHandler } from '../../../common/commands.js'

export default class Fetchur extends ChatCommandHandler {
  private static readonly ItemsList = [
    '20x Yellow Stained Glass',
    '1x Compass',
    '20x Mithril',
    '1x Firework Rocket',
    '1x Coffee',
    '1x Door',
    "3x Rabbits's Foot",
    '1x Superboom TNT',
    '1x Pumpkin',
    '1x Flint and Steel',
    '50x Emerald',
    '50x Red Wool'
  ]

  constructor() {
    super({
      triggers: ['fetchur', 'fetcher'],
      description: 'Show what Fetchur NPC is requesting',
      example: `fetchur`
    })
  }

  handler(): string {
    const time = new Date()
    const dayFormatted = time.toLocaleString('de-DE', { day: '2-digit', timeZone: 'America/New_York' })
    const day = Number.parseInt(dayFormatted, 10)
    const currentItem = Fetchur.ItemsList[(day % Fetchur.ItemsList.length) - 1]
    return `Fetchur's request is ${currentItem}`
  }
}
