import assert from 'node:assert'
import { hash } from 'node:crypto'

import NodeCache from 'node-cache'

import { Platform } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Unlink extends ChatCommandHandler {
  private readonly confirmationId = new NodeCache({ stdTTL: 60 })

  constructor() {
    super({
      triggers: ['unlink'],
      description: 'Unlink Minecraft account from Discord',
      example: 'unlink'
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    assert.ok(context.message.user.isMojangUser())
    const givenId = context.args[0] ?? ''
    const uuid = context.message.user.mojangProfile().id

    if (this.confirmationId.get<string>(givenId) === uuid) {
      const count = context.app.core.verification.invalidate({ uuid: uuid })
      return count > 0 ? `${context.username}, Successfully unlinked!` : `${context.username}, Nothing to Unlink!`
    } else {
      const userLink = await context.app.core.verification.findByIngame(uuid)
      if (userLink === undefined) {
        return `${context.username}, Nothing to Unlink!`
      }

      const id = this.createId()
      this.confirmationId.set(id, uuid)
      return `You are about to unlink your Minecraft account from Discord. To confirm do: ${context.commandPrefix}${this.triggers[0]} ${id}`
    }
  }

  private createId(): string {
    return hash('sha256', Math.random().toString(10)).slice(0, 10).toUpperCase()
  }
}
