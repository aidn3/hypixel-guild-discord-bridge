import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { usernameNotExists } from '../common/utility.js'

import type { UrchinWinstreakMode, UrchinWinstreakModes } from 'src/core/urchin/urchin-api.js'

interface ParsedUrchinWinstreaks {
  overall: number
  core: number
  solos: number
  doubles: number
  threes: number
  fours: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  '4v4': number
}

export default class WinstreakCommand extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'winstreaks',
      triggers: ['winstreaks', 'winstreak', 'ws'],
      description: "Returns a player's winstreaks via the Urchin API",
      example: `winstreaks %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.app.urchinApi === undefined) return `${context.username}, Urchin API is not configured.`

    const givenUsername = context.args.at(0) ?? context.username
    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile === undefined) return usernameNotExists(context, givenUsername)

    const data = await context.app.urchinApi.getWinstreaks(profile.id)
    if (data === undefined) return `${profile.name} has no Urchin winstreaks.`
    const { overall, core, solos, doubles, threes, fours, '4v4': fourVfour } = this.parseWinstreaks(data.modes)
    return `${profile.name}'s overall winstreak: ${overall}, Core: ${core}, Solos: ${solos}, Doubles: ${doubles}, Threes: ${threes}, Fours: ${fours}, 4v4: ${fourVfour}`
  }

  parseWinstreaks({
    overall,
    core,
    solos,
    doubles,
    threes,
    fours,
    '4v4': fourVfour
  }: UrchinWinstreakModes): ParsedUrchinWinstreaks {
    return {
      overall: this.getCurrentWinstreak(overall),
      core: this.getCurrentWinstreak(core),
      solos: this.getCurrentWinstreak(solos),
      doubles: this.getCurrentWinstreak(doubles),
      threes: this.getCurrentWinstreak(threes),
      fours: this.getCurrentWinstreak(fours),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '4v4': this.getCurrentWinstreak(fourVfour)
    }
  }

  getCurrentWinstreak(winstreaks: UrchinWinstreakMode[]): number {
    return winstreaks.toSorted((a, b) => b.timestamp - a.timestamp)[0]?.value ?? 0
  }
}
