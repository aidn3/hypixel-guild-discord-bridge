import { InstanceType, MinecraftSendChatPriority, Permission } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { canOnlyUseIngame } from '../common/utility'

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
      return canOnlyUseIngame(context)
    }
    if ((await originalMessage.user.permission()) !== Permission.Admin) {
      return context.app.i18n.t(($) => $['commands.error.must-be-admin'], { username: context.username })
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
