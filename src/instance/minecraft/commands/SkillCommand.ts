import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { SKYBLOCK_SKILL_DATA, SkyblockMember } from 'hypixel-api-reborn'

const SKILLS = [
  'farming',
  'mining',
  'combat',
  'foraging',
  'fishing',
  'enchanting',
  'alchemy',
  'carpentry',
  'runecrafting',
  'taming',
  'average'
]

export default {
  triggers: ['skill', 's'],
  enabled: true,

  handler: async function (context: ChatCommandContext): Promise<string> {
    const skill = context.args[0]
    const givenUsername = context.args[1] ?? context.username

    if (!SKILLS.includes(skill)) {
      return `${context.username}, Invalid skill! (given: ${skill})`
    }

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid)
      .then((res) => res.filter((p) => p.profileName)[0].me)

    // @ts-expect-error Ignoring impossible to trigger scenario
    const skillData: SKYBLOCK_SKILL_DATA = parsedProfile.skills[skill as keyof SkyblockMember['skills']]

    return `${givenUsername}: ${skill} - ${formatLevel(skillData.level, skillData.progress)}`
  }
} satisfies ChatCommandHandler

function formatLevel(level: number, progress: number): number {
  let formattedLevel = 0

  formattedLevel += level

  const decimal = progress / 100

  if (decimal === 1) {
    return formattedLevel
  }

  formattedLevel += decimal

  return formattedLevel
}
