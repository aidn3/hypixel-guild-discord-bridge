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
      triggers: ['skill', 'skills', 'sk'],
      description: "Returns a player's skills levels",
      example: `skill %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await this.getParsedProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(givenUsername)

    let skillAverage: string | undefined
    const skillsMessage: string[] = []
    for (const [name, skill] of Object.entries(selectedProfile.skills)) {
      if (typeof skill === 'number') {
        skillAverage = Math.floor(skill) === skill ? skill.toString(10) : skill.toFixed(1)
        continue
      }
      // @ts-expect-error string is index-able as key
      skillsMessage.push(`${AbbreviationMappings[name] ?? name} ${this.formatLevel(skill.level, skill.progress)}`)
    }
    assert(skillAverage !== undefined)
    assert(skillsMessage.length > 0)

    return `${givenUsername}: AVG ${skillAverage}, ${skillsMessage.join(', ')}`
  }

  async getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember | undefined> {
    const selectedProfile = await hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles?.find((profile) => profile.selected)?.cute_name)

    if (!selectedProfile) return undefined

    return await hypixelApi
      .getSkyblockProfiles(uuid)
      .then((profiles) => profiles.find((profile) => profile.profileName === selectedProfile)?.me)
  }

  private formatLevel(level: number, progress: number): string {
    if (Number.isNaN(progress) || progress === 100) return level.toFixed(0)

    const formattedLevel = level + progress / 100
    return formattedLevel.toFixed(1)
  }
}
