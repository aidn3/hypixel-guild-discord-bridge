import * as assert from 'node:assert'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  name: 'Secrets',
  triggers: ['secrets', 's'],
  description: 'Returns how many secrets a player has done',
  example: `secrets %s`,
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.clientInstance.app.hypixelApi.getPlayer(uuid)
    assert(parsedProfile)

    const secrets = parsedProfile.achievements.skyblockTreasureHunter as number

    return `${givenUsername}: ${secrets.toLocaleString() || 0}`
  }
} satisfies ChatCommandHandler
