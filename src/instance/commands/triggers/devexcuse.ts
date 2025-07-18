import DefaultAxios from 'axios'

import { ChatCommandHandler } from '../../../common/commands.js'

export default class DevelopmentExcuse extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['devexcuse', 'devexc', 'dev'],
      description: "Show you a random excuse for why this bot isn't working",
      example: 'devexcuse'
    })
  }

  async handler(): Promise<string> {
    let message = "You're asking why it doesn't work?\n"
    message += await DefaultAxios.get<DevelopmentExcuseResponse>(`https://api.devexcus.es/`).then(
      (response) => response.data.text
    )
    return message
  }
}

interface DevelopmentExcuseResponse {
  id: number
  text: string
}
