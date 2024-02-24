import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

import { InstanceType } from '../../../common/application-event'

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
    if (context.instanceType !== InstanceType.MINECRAFT) {
      return 'Can only be executed from Minecraft'
    }
    if (context.username !== context.adminUsername) {
      return `You are not ${context.adminUsername}.`
    }
    if (!context.isAdmin) {
      return 'You are not a Bridge Admin!'
    }
    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    context.app.clusterHelper.sendCommandToMinecraft(context.instanceName, context.args.join(' '))
    return `Override command executed.`
  }
}
