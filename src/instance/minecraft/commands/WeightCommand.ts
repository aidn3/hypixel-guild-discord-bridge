/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import * as assert from 'node:assert'
import Axios, { AxiosResponse } from 'axios'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  triggers: ['weight', 'w'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    return `${givenUsername}'s weight: ${await getSenitherData(givenUsername)}`
  }
} satisfies ChatCommandHandler

async function getSenitherData(username: string): Promise<number> {
  const res = await Axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
    (response: AxiosResponse) => response.data as SkyShiiyuResponse
  )

  const selected = Object.values(res.profiles).find((profile) => profile.current)
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
