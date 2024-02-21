import * as assert from 'node:assert'
import { Client, SKYBLOCK_SKILL_DATA, SkyblockMember } from 'hypixel-api-reborn'
import { ChatCommandContext, ChatCommandHandler } from '../common/CommandInterface'
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

export default class SkillCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Skills',
      triggers: ['skill', 'skills'],
      description: "Returns a player's skill level",
      example: `skill foraging %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const skill = context.args[0]
    const givenUsername = context.args[1] ?? context.username

    if (!SKILLS.has(skill)) {
      return `${context.username}, Invalid skill! (given: ${skill})`
    }

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await this.getParsedProfile(context.app.hypixelApi, uuid)

    // @ts-expect-error Ignoring impossible to trigger scenario
    const skillData: SKYBLOCK_SKILL_DATA = parsedProfile.skills[skill as keyof SkyblockMember['skills']]

    return `${givenUsername}: ${skill} - ${formatLevel(skillData.level, skillData.progress)}`
  }

  async getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
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
}
