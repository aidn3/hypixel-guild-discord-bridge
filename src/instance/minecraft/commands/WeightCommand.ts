/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import * as assert from "node:assert"
import axios from "axios"
import { ChatCommandContext, ChatCommandHandler } from "../common/ChatInterface"

export default {
  name: "Weight",
  triggers: ["weight", "w"],
  description: "Returns a player's senither weight",
  example: `w %s`,
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    return `${givenUsername}'s weight: ${await getSenitherData(givenUsername)}`
  }
} satisfies ChatCommandHandler

async function getSenitherData(username: string): Promise<number> {
  const skyShiiyuResponse = await axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
    (response) => response.data as SkyShiiyuResponse
  )

  const selected = Object.values(skyShiiyuResponse.profiles).find((profile) => profile.current)
  assert(selected)

  return Math.floor(selected.data?.weight.senither.overall ?? 0)
}

interface SkyShiiyuResponse {
  profiles: Record<string, SkyShiiyuProfile>
}

interface SkyShiiyuProfile {
  current: boolean
  data?: { weight: { senither: { overall: number } } }
}
