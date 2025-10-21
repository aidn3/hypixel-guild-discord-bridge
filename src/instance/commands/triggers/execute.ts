import { InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Execute extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['execute', 'exec'],
      description: 'Runs a command directly',
      example: `execute /guild accept aidn5`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const originalMessage = context.message
    if (originalMessage.instanceType !== InstanceType.Minecraft) {
      return 'Can only be executed from Minecraft'
    }
    if (originalMessage.user.permission() !== Permission.Admin) {
      return 'You are not a Bridge Admin!'
    }
    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    await context.app.sendMinecraft(
      [originalMessage.instanceName],
      MinecraftSendChatPriority.High,
      undefined,
      context.args.join(' ')
    )
    return `Command has been executed.`
  }
}
