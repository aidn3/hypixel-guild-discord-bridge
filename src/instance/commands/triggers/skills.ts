import assert from 'node:assert'

import type { SkyBlockMemberPlayerDataSkills } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

const AbbreviationMappings: Record<keyof SkyBlockMemberPlayerDataSkills, string> = {
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
  average: 'avg',
  nonCosmeticAverage: 'non cosmetic avg',
  toString: 'what! if you trigger this please seek help. https://suicidepreventionlifeline.org'
}

export default class Skills extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['skill', 'skills', 'sk', 'skillaverage', 'skillsaverage', 'sa'],
      description: "Returns a player's skills levels",
      example: `skill %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const skillAverage = selectedProfile.me.playerData.skills.average

    const skillsMessage: string[] = []
    for (const [name, skillData] of Object.entries({
      fishing: selectedProfile.me.playerData.skills.fishing,
      alchemy: selectedProfile.me.playerData.skills.alchemy,
      runecrafting: selectedProfile.me.playerData.skills.runecrafting,
      mining: selectedProfile.me.playerData.skills.mining,
      farming: selectedProfile.me.playerData.skills.farming,
      enchanting: selectedProfile.me.playerData.skills.enchanting,
      taming: selectedProfile.me.playerData.skills.taming,
      foraging: selectedProfile.me.playerData.skills.foraging,
      social: selectedProfile.me.playerData.skills.social,
      carpentry: selectedProfile.me.playerData.skills.carpentry,
      combat: selectedProfile.me.playerData.skills.combat
    })) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- TODO: come back to this lol
      // @ts-expect-error
      skillsMessage.push(`${AbbreviationMappings[name] ?? name} ${skillData.level}`)
    }
    assert.ok(skillsMessage.length > 0)

    return `${givenUsername}: AVG ${skillAverage}, ${skillsMessage.join(', ')}`
  }
}
