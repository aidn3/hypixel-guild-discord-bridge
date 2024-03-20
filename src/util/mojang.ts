import type { AxiosResponse } from 'axios'
import axios from 'axios'

export class MojangApi {
  async profileByUsername(username: string): Promise<MojangProfile> {
    return await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then((response: AxiosResponse<MojangProfile, unknown>) => response.data)
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    return await axios
      .get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
      .then((response: AxiosResponse<MojangProfile, unknown>) => response.data)
  }

  async profilesByUsername(usernames: string[]): Promise<MojangProfile[]> {
    return await axios
      .post(`https://api.mojang.com/profiles/minecraft`, usernames)
      .then((response: AxiosResponse<MojangProfile[], unknown>) => response.data)
  }
}

export interface MojangProfile {
  id: string
  name: string
}
