import assert from 'node:assert'

import Axios from 'axios'

import { ChatCommandHandler } from '../../../common/commands.js'

export default class DadJoke extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Dadjoke',
      triggers: ['dadjoke', 'joke', 'dad'],
      description: 'Show you a random dad joke',
      example: 'dadjoke'
    })
  }

  async handler(): Promise<string> {
    /* eslint-disable @typescript-eslint/naming-convention */
    const config = {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'hypixel-guild-discord-bridge (https://github.com/aidn3/hypixel-guild-discord-bridge)'
      }
    }
    /* eslint-enable @typescript-eslint/naming-convention */

    return await Axios.get<DadJokeResponse>(`https://icanhazdadjoke.com/`, config)
      .then((response) => response.data)
      .then((value) => {
        assert.strictEqual(value.status, 200)
        return value.joke
      })
  }
}

interface DadJokeResponse {
  id: string
  joke: string
  status: number
}
