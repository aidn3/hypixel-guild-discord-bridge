import assert from 'node:assert'

import DefaultAxios from 'axios'

import type { ChatCommandCooldown } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import Duration from '../../../utility/duration.js'

export default class Catfacts extends ChatCommandHandler {
  private static readonly Url = 'https://catfact.ninja/fact?max_length=100'

  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'cat-facts',
      triggers: ['catfact', 'catfacts', 'cat'],
      description: 'display a random cat fact',
      example: 'catfact'
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: Duration.seconds(1) }
  }

  async handler(): Promise<string> {
    const response = await DefaultAxios.get<CatfactApi>(Catfacts.Url)
    const fact = response.data.fact
    assert.strictEqual(typeof fact, 'string')
    return fact
  }
}

interface CatfactApi {
  fact: string
}
