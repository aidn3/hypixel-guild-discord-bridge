/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'
import Axios, { AxiosResponse } from 'axios'

export default {
  triggers: ['weight', 'w'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] != null ? args[0] : username
    return `${givenUsername}'s weight: ${await getSenitherData(givenUsername)}`
  }
} satisfies MinecraftCommandMessage

async function getSenitherData(username: string): Promise<number> {
  const profiles: any[] = await Axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`).then(
    (res: AxiosResponse) => res.data.profiles
  )

  const weight = Object.values(profiles).find((profile) => profile.current).data.weight.senither

  return Math.floor(weight.overall ?? 0)
}
