import { hash } from 'node:crypto'

import NodeCache from 'node-cache'

import { InstanceType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
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

  async handler(context: ChatCommandContext): Promise<string> {
    const givenId = context.args[0] ?? ''

    if (context.message.instanceType !== InstanceType.Minecraft) {
      return `${context.username}, Can only use this command in-game`
    }

    const uuid = await getUuidIfExists(context.app.mojangApi, context.username)
    if (uuid === undefined) {
      return `${context.username}, Could not resolve your profile uuid??`
    }

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
