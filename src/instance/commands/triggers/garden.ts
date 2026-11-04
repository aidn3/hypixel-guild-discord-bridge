import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, hypixelApiNotSet, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility.js'

export default class Garden extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'garden',
      triggers: ['garden', 'ga'],
      description: "Returns a player's Garden stats",
      example: `ga %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const profile = await hypixel.getSkyblockProfiles(uuid)
    const selectedProfile = profile?.find((profile) => profile.selected) ?? profile?.at(0)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)

    const bestiary = selectedProfile.members[uuid].bestiary?.kills ?? {}
    const totalKilledPests = Object.entries(bestiary)
      .filter(([key]) => key.startsWith('pest_'))
      .map(([, value]) => value as number)
      .reduce((a, b) => a + b, 0)

    // TODO: average crops milestone
    //  Hypixel has changed crops milestone.
    //  Till they are updated in the source, the feature will be left out.
    //  Source: https://wiki.hypixel.net/Garden

    const garden = await hypixel.getSkyblockGarden(selectedProfile.profile_id)
    if (garden === undefined) {
      return context.app.i18n.t(($) => $['commands.garden.no-garden'], { username: givenUsername })
    }

    const totalVisitors = Object.values(garden.commission_data.completed).reduce((a, b) => a + b)
    const uniqueVisitors = Object.values(garden.commission_data.completed).filter((entry) => entry > 0).length
    const copper = selectedProfile.members[uuid].garden_player_data?.copper ?? 0
    const gardenLevel = this.getGardenLevel(garden.garden_experience)
    return context.app.i18n.t(($) => $['commands.garden.response'], {
      username: givenUsername,
      level: gardenLevel,
      copper,
      totalKilledPests: totalKilledPests,
      totalVisitors: totalVisitors,
      uniqueVisitors: uniqueVisitors
    })
  }

  private getGardenLevel(experience: number): number {
    const experienceTable = [
      0, 70, 140, 280, 520, 1120, 2620, 4620, 7120, 10_120, 20_120, 30_120, 40_120, 50_120, 60_120
    ]
    const overflowPerLevel = 10_000
    const maxBaseExperience = 60_120

    let level = 1
    for (const [index, requiredXp] of experienceTable.entries()) {
      if (experience >= requiredXp) {
        level = index + 1
      } else {
        break
      }
    }

    if (experience > maxBaseExperience) {
      const overflowExperience = experience - maxBaseExperience
      level += Math.floor(overflowExperience / overflowPerLevel)
    }

    return level
  }
}
