import { InstanceType, MinecraftSendChatPriority } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler, Permission } from '../../../common/commands.js'

export default class Override extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Override',
      triggers: ['override', 'o'],
      description: 'Runs a command directly',
      example: `override /guild accept aidn5`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.instanceType !== InstanceType.Minecraft) {
      return 'Can only be executed from Minecraft'
    }
    if (context.username !== context.adminUsername) {
      return `You are not ${context.adminUsername}.`
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

    return `Override command executed.`
  }
}
