/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import assert from 'node:assert'

import { type AxiosResponse } from 'axios'
import DefaultAxios from 'axios'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Weight extends ChatCommandHandler {
  constructor() {
    super({
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
    const skyShiiyuResponse = await DefaultAxios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
      (response: AxiosResponse<SkyShiiyuResponse, unknown>) => response.data
    )

    const selected = Object.values(skyShiiyuResponse.profiles).find((profile) => profile.current)
    assert.ok(selected)

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
