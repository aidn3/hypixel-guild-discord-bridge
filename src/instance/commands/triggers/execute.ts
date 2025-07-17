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

  handler(context: ChatCommandContext): string {
    if (context.instanceType !== InstanceType.Minecraft) {
      return 'Can only be executed from Minecraft'
    }
    if (context.permission !== Permission.Admin) {
      return 'You are not a Bridge Admin!'
    }
    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    context.app.emit('minecraftSend', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: [context.instanceName],
      priority: MinecraftSendChatPriority.High,
      command: context.args.join(' ')
    })

    return `Command has been executed.`
  }
}
