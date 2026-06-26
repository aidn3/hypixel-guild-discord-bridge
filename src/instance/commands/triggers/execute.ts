import assert from 'node:assert'

import { MinecraftSendChatPriority, Permission, Platform } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Execute extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['execute', 'exec'],
      description: 'Runs a command directly',
      example: `execute /guild accept aidn5`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], permission: Permission.BridgeAdmin }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const originalMessage = context.message
    assert.ok(originalMessage.platform === Platform.Minecraft)

    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    await context.app.sendMinecraft(
      [originalMessage.instance],
      MinecraftSendChatPriority.High,
      undefined,
      context.args.join(' ')
    )
    return `Command has been executed.`
  }
}
