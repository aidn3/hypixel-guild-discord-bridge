import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { HypixelSkyblockSkill } from '../../../core/hypixel/hypixel-skyblock-types'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const profile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (profile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)

    const skillsResponse = await context.app.hypixelApi.getSkyblockSkills()
    const skills = skillsResponse.skills

    const farmingCap = profile.jacobs_contest?.perks?.farming_level_cap ?? 0
    const tamingCap = profile.pets_data?.pet_care?.pet_types_sacrificed?.length ?? 0

    const farming = this.getLevel(skills.FARMING, profile.player_data.experience?.SKILL_FARMING ?? 0)
    const mining = this.getLevel(skills.MINING, profile.player_data.experience?.SKILL_MINING ?? 0)
    const combat = this.getLevel(skills.COMBAT, profile.player_data.experience?.SKILL_COMBAT ?? 0)
    const foraging = this.getLevel(skills.FORAGING, profile.player_data.experience?.SKILL_FORAGING ?? 0)
    const fishing = this.getLevel(skills.FISHING, profile.player_data.experience?.SKILL_FISHING ?? 0)
    const enchanting = this.getLevel(skills.ENCHANTING, profile.player_data.experience?.SKILL_ENCHANTING ?? 0)
    const alchemy = this.getLevel(skills.ALCHEMY, profile.player_data.experience?.SKILL_ALCHEMY ?? 0)
    const carpentry = this.getLevel(skills.CARPENTRY, profile.player_data.experience?.SKILL_CARPENTRY ?? 0)
    const runecrafting = this.getLevel(skills.RUNECRAFTING, profile.player_data.experience?.SKILL_RUNECRAFTING ?? 0)
    const social = this.getLevel(skills.SOCIAL, profile.player_data.experience?.SKILL_SOCIAL ?? 0)
    const taming = this.getLevel(skills.TAMING, profile.player_data.experience?.SKILL_TAMING ?? 0)
    const hunting = 0 // TODO: wait till Hypixel API updates

    const totalLevels =
      farming +
      mining +
      combat +
      foraging +
      fishing +
      enchanting +
      alchemy +
      carpentry +
      taming +
      hunting

    /*
     * Skills count may change in the future. This keeps it updated.
     * "Social" and "Runecrafting" skills are ignored since they are cosmetic only.
     */
    const officialSkillsCount = Object.keys(skillsResponse.skills).length - 2
    const average = totalLevels / officialSkillsCount

    return context.app.i18n.t(($) => $['commands.skills.response'], {
      username: givenUsername,
      average: average,

      farming: Math.min(farming, 50 + farmingCap),
      mining: mining,
      combat: combat,
      foraging: foraging,
      fishing: fishing,
      enchanting: enchanting,
      alchemy: alchemy,
      carpentry: carpentry,
      runecrafting: runecrafting,
      social: social,
      taming: Math.min(taming, 50 + tamingCap),
      hunting: hunting
    })
  }

  private getLevel(skill: HypixelSkyblockSkill, experience: number): number {
    const xpRequired = skill.levels.map((level) => level.totalExpRequired)
    const index = xpRequired.toReversed().findIndex((level) => level <= experience)

    if (index === -1) {
      return experience / xpRequired[0]
    } else if (index === 0) {
      return xpRequired.length
    } else {
      const actualIndex = xpRequired.length - index - 1
      let level = actualIndex + 1
      const remainingExperience = experience - xpRequired[actualIndex]
      const experienceRequiredNextLevel = xpRequired[actualIndex + 1] - xpRequired[actualIndex]
      level += remainingExperience / experienceRequiredNextLevel
      return level
    }
  }
}
