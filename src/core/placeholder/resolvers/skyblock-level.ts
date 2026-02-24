import type { PlaceholderContext } from '../common'
import { CanNotResolve, PlaceholderResolver } from '../common'
import { formatNumber } from '../utility'

export class SkyblockLevelResolver extends PlaceholderResolver {
  override keyword(): string {
    return 'SKYBLOCK_LEVEL'
  }

  override description(): string {
    return 'Highest Hypixel Skyblock level'
  }

  override options(): Record<string, string> {
    return {}
  }

  override async resolve(context: PlaceholderContext, options: string[]): Promise<string> {
    const uuid = context.user?.mojangProfile()?.id
    if (uuid === undefined) throw new CanNotResolve()

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (!profiles) throw new CanNotResolve()

    const highestExperience = profiles
      .map((profile) => profile.members[uuid].leveling?.experience)
      .filter((experience) => experience !== undefined)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b), 0)

    const level = highestExperience / 100

    return formatNumber(level, options)
  }
}
