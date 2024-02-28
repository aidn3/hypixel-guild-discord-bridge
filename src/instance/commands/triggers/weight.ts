/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import assert from 'node:assert'

import axios, { type AxiosResponse } from 'axios'

import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

export default class Weight extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Weight',
      triggers: ['weight', 'w'],
      description: "Returns a player's senither weight",
      example: `w %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    return `${givenUsername}'s weight: ${await this.getSenitherData(givenUsername)}`
  }

  private async getSenitherData(username: string): Promise<number> {
    const skyShiiyuResponse = await axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
      (response: AxiosResponse<SkyShiiyuResponse, unknown>) => response.data
    )

    const selected = Object.values(skyShiiyuResponse.profiles).find((profile) => profile.current)
    assert(selected)

    return Math.floor(selected.data?.weight.senither.overall ?? 0)
  }
}

interface SkyShiiyuResponse {
  profiles: Record<string, SkyShiiyuProfile>
}

interface SkyShiiyuProfile {
  current: boolean
  data?: { weight: { senither: { overall: number } } }
}
