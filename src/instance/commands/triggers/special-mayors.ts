import { ChatCommandHandler } from '../../../common/commands.js'
import { formatTime } from '../../../utility/shared-utility'
import { SkyblockEvents } from '../../../utility/skyblock-instant'
import { capitalize } from '../common/utility'

export default class SpecialMayors extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['specialmayors', 'specialmayor', 'smayor', 'smayors'],
      description: 'Show when Skyblock special mayors are coming',
      example: `smayors`
    })
  }

  handler(): string {
    const currentTime = Date.now()
    const specialMayors = Object.entries(SkyblockEvents.getSpecialMayors(currentTime)).toSorted(
      ([, a], [, b]) => a.time - b.time
    )

    const result: string[] = []

    for (const [name, appointment] of specialMayors) {
      let mayorResult = ''
      mayorResult += capitalize(name)

      switch (appointment.type) {
        case 'future': {
          mayorResult += ' in '
          break
        }
        case 'happening': {
          mayorResult += ' till '
          break
        }
        default: {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`${appointment.type} is not a valid appointment type`)
        }
      }

      mayorResult += formatTime(appointment.time - currentTime)
      result.push(mayorResult)
    }

    return `Special Mayors: ${result.join(' | ')}`
  }
}
