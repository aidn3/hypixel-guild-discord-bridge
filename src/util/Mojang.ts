import Axios from 'axios'

export class MojangApi {
  async profileByUsername(username: string): Promise<MojangProfile> {
    return await Axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`).then(
      (response) => response.data as MojangProfile
    )
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    return await Axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`).then(
      (response) => response.data as MojangProfile
    )
  }

  async profilesByUsername(usernames: string[]): Promise<MojangProfile[]> {
    return await Axios.post(`https://api.mojang.com/profiles/minecraft`, usernames).then(
      (response) => response.data as MojangProfile[]
    )
  }
}

export interface MojangProfile {
  id: string
  name: string
}
