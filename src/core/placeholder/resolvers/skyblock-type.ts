import assert from 'node:assert'

import type { SkyblockProfile } from '../../hypixel/hypixel-skyblock.js'
import type { PlaceholderContext } from '../common.js'
import { CanNotResolve, PlaceholderResolver } from '../common.js'
import { formatString } from '../utility.js'

export class SkyblockTypeResolver extends PlaceholderResolver {
  override keyword(): string {
    return 'SKYBLOCK_TYPE_ICON'
  }

  override description(): string {
    return 'Highest Hypixel Skyblock profile icon'
  }

  override options(): Record<string, string> {
    return {}
  }

  override async resolve(context: PlaceholderContext, options: string[]): Promise<string> {
    const uuid = context.user?.mojangProfile()?.id
    if (uuid === undefined) throw new CanNotResolve()

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (!profiles) throw new CanNotResolve()

    let highestProfile: SkyblockProfile | undefined = undefined
    let highestExperience = -1
    for (const profile of profiles) {
      const currentExperience = profile.members[uuid].leveling?.experience ?? 0
      if (currentExperience > highestExperience) {
        highestProfile = profile
        highestExperience = currentExperience
      }
    }

    assert.ok(highestProfile !== undefined)
    const profileType = highestProfile.game_mode

    switch (profileType) {
      case undefined: {
        // classic
        return formatString('Ⓢ', options)
      }
      case 'ironman': {
        return formatString('♲', options)
      }
      case 'bingo': {
        return formatString('Ⓑ', options)
      }
      case 'island': {
        return formatString('☀', options)
      }
      default: {
        profileType satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`Unknown profile type: ${profileType}`)
      }
    }
  }
}
