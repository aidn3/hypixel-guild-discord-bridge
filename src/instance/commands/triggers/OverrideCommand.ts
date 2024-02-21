import { ChatCommandContext, ChatCommandHandler } from '../Common'
import { LOCATION } from '../../../common/ClientInstance'

export default class OverrideCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Override',
      triggers: ['override', 'o'],
      description: 'Runs a command directly',
      example: `override /guild accept aidn5`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.location !== LOCATION.MINECRAFT) {
      return 'Can only be executed from Minecraft'
    }
    if (context.username !== context.adminUsername) {
      return `You are not ${context.adminUsername}.`
    }
    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    context.app.clusterHelper.sendCommandToMinecraft(context.instanceName, context.args.join(' '))
    return `Override command executed.`
  }
}
