import * as assert from 'node:assert'
import { Client, SKYBLOCK_SKILL_DATA, SkyblockMember } from 'hypixel-api-reborn'
import Axios, { AxiosResponse } from 'axios'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { formatLevel } from '../../../util/SkyblockApi'

const SKILLS = new Set([
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
])

export default {
  name: 'Skills',
  triggers: ['skill', 'skills'],
  description: "Returns a player's skill level",
  example: `skill foraging %s`,
  enabled: true,

  handler: async function (context: ChatCommandContext): Promise<string> {
    const skill = context.args[0]
    const givenUsername = context.args[1] ?? context.username

    if (!SKILLS.has(skill)) {
      return `Skills: ${[...SKILLS].join(', ')}`
    }

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await getParsedProfile(context.clientInstance.app.hypixelApi, uuid)

    if (skill === 'average') {
      const skillAverage = await getSkillAverage(givenUsername)
      return `${givenUsername}: ${skill} - ${skillAverage.toFixed(2)}`
    } else {
      // @ts-expect-error Ignoring impossible to trigger scenario
      const skillData: SKYBLOCK_SKILL_DATA = parsedProfile.skills[skill as keyof SkyblockMember['skills']]
      return `${givenUsername}: ${skill} - ${formatLevel(skillData.level, skillData.progress)}`
    }
  }
} satisfies ChatCommandHandler

async function getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  const selectedProfile = await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((response) => response.profiles.find((profile) => profile.selected)?.cute_name)
  assert(selectedProfile)

  const response = await hypixelApi
    .getSkyblockProfiles(uuid)
    .then((profiles) => profiles.find((profile) => profile.profileName === selectedProfile)?.me)

  assert(response)
  return response
}

async function getSkillAverage(username: string): Promise<number> {
  const skyShiiyuResponse = await Axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
    (response: AxiosResponse) => response.data as SkyShiiyuResponse
  )

  const selected = Object.values(skyShiiyuResponse.profiles).find((profile) => profile.current)
  assert(selected)

  return selected.data?.average_level ?? 0
}

interface SkyShiiyuResponse {
  profiles: Record<string, SkyShiiyuProfile>
}

interface SkyShiiyuProfile {
  current: boolean
  data?: { average_level: number }
}
