import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber, titleCase } from '../../../common/helper-functions.js'
import { getSkillAverage, getSkills, SkillOrder } from '../common/skills'
import {
  getSelectedSkyblockProfileData,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Skills extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['skills', 'skill', 'sa'],
      description: 'Skills and Skill Average of specified user.',
      example: `skills %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selected = await getSelectedSkyblockProfileData(context.app.hypixelApi, uuid)
    if (!selected) return playerNeverPlayedSkyblock(context, givenUsername)

    const skills = getSkills(selected.member, selected.profile)
    if (!skills) return `${givenUsername} has no skills.`

    const skillAverage = getSkillAverage(selected.member)

    const formattedSkills = SkillOrder.map((skill) => {
      const data = skills[skill]
      return `${titleCase(skill)}: ${formatNumber(data.levelWithProgress, 2)}`
    })

    return `${givenUsername}'s Skill Average: ${skillAverage} (${formattedSkills.join(', ')})`
  }
}
