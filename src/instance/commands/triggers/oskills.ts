import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { HypixelSkyblockSkill } from '../../../core/hypixel/hypixel-skyblock-types'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility'

export default class OverflowSkills extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['oskills', 'oskill', 'osk', 'overflowskills'],
      description: "Returns a player's skills levels without cap",
      example: `oskills %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const profiles = await context.app.hypixelApi.getSkyblockProfiles(uuid)
    if (!profiles || profiles.length === 0) return playerNeverPlayedSkyblock(context, givenUsername)
    const memberProfile = profiles.find((p) => p.selected)
    assert.ok(memberProfile !== undefined)

    const profile = memberProfile.members[uuid]

    const skillsResponse = await context.app.hypixelApi.getSkyblockSkills()
    const skills = skillsResponse.skills
    const totalSocialExperience = Object.values(memberProfile.members) // Social level is the sum of all coop members
      .map((profile) => profile.player_data.experience?.SKILL_SOCIAL ?? 0)
      .reduce((a, b) => a + b, 0)

    const farming = this.getLevel(skills.COMBAT, skills.FARMING, profile.player_data.experience?.SKILL_FARMING ?? 0)
    const mining = this.getLevel(skills.COMBAT, skills.MINING, profile.player_data.experience?.SKILL_MINING ?? 0)
    const combat = this.getLevel(skills.COMBAT, skills.COMBAT, profile.player_data.experience?.SKILL_COMBAT ?? 0)
    const foraging = this.getLevel(skills.COMBAT, skills.FORAGING, profile.player_data.experience?.SKILL_FORAGING ?? 0)
    const fishing = this.getLevel(skills.COMBAT, skills.FISHING, profile.player_data.experience?.SKILL_FISHING ?? 0)
    const enchanting = this.getLevel(
      skills.COMBAT,
      skills.ENCHANTING,
      profile.player_data.experience?.SKILL_ENCHANTING ?? 0
    )
    const alchemy = this.getLevel(skills.COMBAT, skills.ALCHEMY, profile.player_data.experience?.SKILL_ALCHEMY ?? 0)
    const carpentry = this.getLevel(
      skills.COMBAT,
      skills.CARPENTRY,
      profile.player_data.experience?.SKILL_CARPENTRY ?? 0
    )
    const runecrafting = this.getLevel(
      skills.COMBAT,
      skills.RUNECRAFTING,
      profile.player_data.experience?.SKILL_RUNECRAFTING ?? 0
    )
    const social = this.getLevel(skills.COMBAT, skills.SOCIAL, totalSocialExperience)
    const taming = this.getLevel(skills.COMBAT, skills.TAMING, profile.player_data.experience?.SKILL_TAMING ?? 0)
    const hunting = this.getLevel(skills.COMBAT, skills.HUNTING, profile.player_data.experience?.SKILL_HUNTING ?? 0)

    const totalLevels =
      farming + mining + combat + foraging + fishing + enchanting + alchemy + carpentry + taming + hunting

    /*
     * Skills count may change in the future. This keeps it updated.
     * "Social" and "Runecrafting" skills are ignored since they are cosmetic only.
     */
    const officialSkillsCount = Object.keys(skillsResponse.skills).length - 2
    const average = totalLevels / officialSkillsCount

    return context.app.i18n.t(($) => $['commands.oskills.response'], {
      username: givenUsername,
      average: average,

      farming: farming,
      mining: mining,
      combat: combat,
      foraging: foraging,
      fishing: fishing,
      enchanting: enchanting,
      alchemy: alchemy,
      carpentry: carpentry,
      runecrafting: runecrafting,
      social: social,
      taming: taming,
      hunting: hunting
    })
  }
  /*
   * Alternative leveling is required since some skills are capped
   * and need to supplement their levels with another
   * that has the required levels data.
   *
   * It isn't perfect, but it will give a more precise approximation to the uncapped level.
   */
  private getLevel(alternativeSkill: HypixelSkyblockSkill, skill: HypixelSkyblockSkill, experience: number): number {
    const levelingTable = skill.levels.map((level, index, array) =>
      index === 0 ? level.totalExpRequired : level.totalExpRequired - array[index - 1].totalExpRequired
    )
    const alternativeLevelingTable = alternativeSkill.levels.map((level, index, array) =>
      index === 0 ? level.totalExpRequired : level.totalExpRequired - array[index - 1].totalExpRequired
    )

    let level = 0
    let nextLevelExperience = levelingTable[level]
    let skillOverflowSlope = 600_000

    while (experience >= nextLevelExperience) {
      level++
      experience -= nextLevelExperience

      if (level >= levelingTable.length) {
        if (level < alternativeLevelingTable.length) {
          nextLevelExperience = alternativeLevelingTable[level]
        } else {
          nextLevelExperience += skillOverflowSlope
          if (level % 10 === 0 && level != 60) skillOverflowSlope *= 2
        }
      } else {
        nextLevelExperience = levelingTable[level]
      }
    }

    return level + experience / nextLevelExperience
  }
}
