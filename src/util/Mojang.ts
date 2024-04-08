import axios from "axios"

export class MojangApi {
  async profileByUsername(username: string): Promise<MojangProfile> {
    return await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then((response) => response.data as MojangProfile)
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    return await axios
      .get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
      .then((response) => response.data as MojangProfile)
  }

  async profilesByUsername(usernames: string[]): Promise<MojangProfile[]> {
    return await axios
      .post(`https://api.mojang.com/profiles/minecraft`, usernames)
      .then((response) => response.data as MojangProfile[])
  }
}

export interface MojangProfile {
  id: string
  name: string
}
