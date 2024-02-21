import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  name: 'Override',
  triggers: ['override', 'o'],
  description: 'Runs a command directly',
  example: `override /guild accept aidn5`,
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    if (context.username !== context.clientInstance.config.adminUsername) {
      return `You are not ${context.clientInstance.config.adminUsername}.`
    }

    if (context.args.length <= 0) {
      return `Example: ${context.clientInstance.config.commandPrefix}${this.example}`
    }

    void context.clientInstance.send(context.args.join(' '))
    return `Override command executed.`
  }
} satisfies ChatCommandHandler
