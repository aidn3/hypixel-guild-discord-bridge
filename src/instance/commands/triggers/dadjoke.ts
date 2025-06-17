import Axios from 'axios'

import { ChatCommandHandler } from '../../../common/commands.js'

export default class DadJoke extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Dadjoke',
      triggers: ['joke', 'dad'],
      description: 'Show you a random dad joke',
      example: 'dadjoke'
    })
  }

  async handler(): Promise<string> {
    const config = {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'User-Agent': 'hypixel-guild-discord-bridge (https://github.com/aidn3/hypixel-guild-discord-bridge)'
      }
    }

    return await Axios.get<DevelopmentExcuseResponse>(`https://icanhazdadjoke.com/`, config).then(
      (response) => response.data.joke
    )
  }
}

interface DevelopmentExcuseResponse {
  id: string
  joke: string
  status: number
}
