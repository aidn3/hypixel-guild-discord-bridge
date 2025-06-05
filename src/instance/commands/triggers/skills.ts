import assert from 'node:assert'

import type { Client, SkyblockMember } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/util.js'

const AbbreviationMappings: Record<keyof SkyblockMember['skills'], string> = {
  combat: 'combat',
  farming: 'farm',
  mining: 'mine',
  enchanting: 'enchant',
  alchemy: 'alch',
  fishing: 'fish',
  carpentry: 'carp',
  foraging: 'forage',
  social: 'social',
  runecrafting: 'rune',
  taming: 'tame',
  average: 'average'
}

export default class Skills extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Skills',
      triggers: ['skill', 'skills', 'sk', 'skillaverage', 'skillsaverage', 'sa'],
      description: "Returns a player's skills levels",
      example: `skill %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const result = await this.getParsedProfile(context.app.hypixelApi, uuid)
    if (result === undefined) return playerNeverPlayedSkyblock(givenUsername)

    const selectedProfile = result.profile
    const farmingCap = result.farmingCap
    const tamingCap = result.tamingCap

    let skillAverage: string | undefined
    const skillsMessage: string[] = []
    for (const [name, skill] of Object.entries(selectedProfile.skills)) {
      if (typeof skill === 'number') {
        skillAverage = Math.floor(skill) === skill ? skill.toString(10) : skill.toFixed(1)
        continue
      }

      let formattedLevel: string
      if (name === 'farming') formattedLevel = this.formatLevel(skill.level, skill.progress, 50 + farmingCap)
      else if (name === 'taming') formattedLevel = this.formatLevel(skill.level, skill.progress, 50 + tamingCap)
      else formattedLevel = this.formatLevel(skill.level, skill.progress, undefined)

      // @ts-expect-error string is index-able as key
      skillsMessage.push(`${AbbreviationMappings[name] ?? name} ${formattedLevel}`)
    }
    assert(skillAverage !== undefined)
    assert(skillsMessage.length > 0)

    return `${givenUsername}: AVG ${skillAverage}, ${skillsMessage.join(', ')}`
  }

  async getParsedProfile(
    hypixelApi: Client,
    uuid: string
  ): Promise<
    | {
        profile: SkyblockMember
        farmingCap: number
        tamingCap: number
      }
    | undefined
  > {
    const rawProfiles = await hypixelApi.getSkyblockProfiles(uuid, { raw: true })
    if (rawProfiles.profiles === undefined) return undefined

    let cuteName: string | undefined
    let farmingCap: number | undefined
    let tamingCap: number | undefined
    for (const profile of rawProfiles.profiles) {
      if (profile.selected) {
        cuteName = profile.cute_name
        farmingCap = profile.members[uuid].jacobs_contest?.perks?.farming_level_cap ?? 0
        tamingCap = profile.members[uuid].pets_data?.pet_care?.pet_types_sacrificed.length ?? 0
        break
      }
    }

    assert(cuteName !== undefined)
    assert(farmingCap !== undefined)
    assert(tamingCap !== undefined)

    const parsedProfile = await hypixelApi
      .getSkyblockProfiles(uuid)
      .then((profiles) => profiles.find((profile) => profile.profileName === cuteName)?.me)

    assert(parsedProfile)
    return { profile: parsedProfile, farmingCap: farmingCap, tamingCap: tamingCap }
  }

  private formatLevel(level: number, progress: number, levelCap: number | undefined): string {
    if (Number.isNaN(progress) || progress === 100) {
      return levelCap === undefined ? level.toFixed(0) : Math.min(level, levelCap).toFixed(0)
    }

    const formattedLevel = level + progress / 100
    if (levelCap !== undefined && formattedLevel > levelCap) {
      return Math.min(formattedLevel, levelCap).toFixed(0)
    }
    return formattedLevel.toFixed(1)
  }
}
