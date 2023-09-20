import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { Client, SKYBLOCK_SKILL_DATA, SkyblockMember } from 'hypixel-api-reborn'
import { HypixelSkyblock } from '../../../type/HypixelApiType'

export default {
  triggers: ['skill', 's'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[1] ?? context.username
    const skills = [
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
    const skill = context.args[0]

    if (!skills.includes(skill)) {
      return `${context.username}, Invalid skill! (given: ${skill})`
    }

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await getParsedProfile(context.clientInstance.app.hypixelApi, uuid)

    // @ts-expect-error Ignoring impossible to trigger scenario
    const skillData: SKYBLOCK_SKILL_DATA = parsedProfile.skills[skill as keyof SkyblockMember['skills']]

    return `${givenUsername}: ${skill} - ${formatLevel(skillData.level, skillData.progress)}`
  }
} satisfies ChatCommandHandler

async function getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  const selectedProfile = await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((res) => res as unknown as HypixelSkyblock)
    .then((res) => res.profiles.filter((p) => p.selected)[0].cute_name)

  return await hypixelApi
    .getSkyblockProfiles(uuid)
    .then((profiles) => profiles.filter((profile) => profile.profileName === selectedProfile)[0].me)
}

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
