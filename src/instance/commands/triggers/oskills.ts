import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getSkillLevelUncapped, getSkills } from '../../../core/hypixel/hypixel-skyblock.js'
import { getUuidIfExists, hypixelApiNotSet, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility.js'

export default class OverflowSkills extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'oskills',
      triggers: ['oskills', 'oskill', 'osk', 'overflowskills'],
      description: "Returns a player's skills levels without cap",
      example: `oskills %s`
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

    const skillsResponse = await hypixel.getSkyblockSkills()
    const skills = skillsResponse.skills
    const totalSocialExperience = Object.values(memberProfile.members) // Social level is the sum of all coop members
      .map((profile) => profile.player_data?.experience?.SKILL_SOCIAL ?? 0)
      .reduce((a, b) => a + b, 0)

    const calculatedSkills = getSkills(skills, profile)
    const social = getSkillLevelUncapped(skills.COMBAT, skills.SOCIAL, totalSocialExperience)

    return context.app.i18n.t(($) => $['commands.oskills.response'], {
      username: givenUsername,
      average: calculatedSkills.average.uncapped,

      farming: calculatedSkills.farming.uncapped,
      mining: calculatedSkills.mining.uncapped,
      combat: calculatedSkills.combat.uncapped,
      foraging: calculatedSkills.foraging.uncapped,
      fishing: calculatedSkills.fishing.uncapped,
      enchanting: calculatedSkills.enchanting.uncapped,
      alchemy: calculatedSkills.alchemy.uncapped,
      carpentry: calculatedSkills.carpentry.uncapped,
      runecrafting: calculatedSkills.runecrafting.uncapped,
      social: social,
      taming: calculatedSkills.taming.uncapped,
      hunting: calculatedSkills.hunting.uncapped
    })
  }
}
