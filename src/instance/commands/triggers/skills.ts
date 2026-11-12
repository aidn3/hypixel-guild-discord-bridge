import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getSkillLevel, getSkills } from '../../../core/hypixel/hypixel-skyblock.js'
import { getUuidIfExists, hypixelApiNotSet, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility.js'

export default class Skills extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'skills',
      triggers: ['skill', 'skills', 'sk', 'skillaverage', 'skillsaverage', 'sa'],
      description: "Returns a player's skills levels",
      example: `skill %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const profiles = await hypixel.getSkyblockProfiles(uuid)
    if (!profiles || profiles.length === 0) return playerNeverPlayedSkyblock(context, givenUsername)
    const memberProfile = profiles.find((p) => p.selected) ?? profiles.at(0)
    assert.ok(memberProfile !== undefined)

    const profile = memberProfile.members[uuid]

    if (!profile.player_data?.experience) {
      return context.app.i18n.t(($) => $['commands.skills.api-disabled'], { username: givenUsername })
    }

    const skillsResponse = await hypixel.getSkyblockSkills()
    const skills = skillsResponse.skills
    const totalSocialExperience = Object.values(memberProfile.members) // Social level is the sum of all coop members
      .map((profile) => profile.player_data?.experience?.SKILL_SOCIAL ?? 0)
      .reduce((a, b) => a + b, 0)

    const farmingCap = profile.jacobs_contest?.perks?.farming_level_cap ?? 0
    const tamingCap = profile.pets_data?.pet_care?.pet_types_sacrificed?.length ?? 0

    const calculatedSkills = getSkills(skills, profile)

    return context.app.i18n.t(($) => $['commands.skills.response'], {
      username: givenUsername,
      average: calculatedSkills.average.capped,

      farming: Math.min(calculatedSkills.farming.capped, 50 + farmingCap),
      mining: calculatedSkills.mining.capped,
      combat: calculatedSkills.combat.capped,
      foraging: calculatedSkills.foraging.capped,
      fishing: calculatedSkills.fishing.capped,
      enchanting: calculatedSkills.enchanting.capped,
      alchemy: calculatedSkills.alchemy.capped,
      carpentry: calculatedSkills.carpentry.capped,
      runecrafting: calculatedSkills.runecrafting.capped,
      social: getSkillLevel(skills.SOCIAL, totalSocialExperience),
      taming: Math.min(calculatedSkills.taming.capped, 50 + tamingCap),
      hunting: calculatedSkills.hunting.capped
    })
  }
}
