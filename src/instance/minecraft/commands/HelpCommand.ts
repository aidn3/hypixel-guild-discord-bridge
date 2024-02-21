import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  name: 'Help',
  triggers: ['help', 'command', 'commands', 'cmd', 'cmds'],
  description: 'Shows a command description and an example about its usage',
  example: `help 8balls`,
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    if (context.args.length <= 0) {
      return `Commands: ${context.allCommands.map((command) => command.name).join(', ')}`
    }

    const query = context.args[0]
    const command = context.allCommands.find((c) => c.triggers.includes(query[0].toLowerCase()))
    if (command == undefined) {
      return `That command does not exist, use ${context.clientInstance.config.commandPrefix}${this.triggers[0]}`
    }

    return (
      `${command.name}: ${command.description} ` +
      `(${context.clientInstance.config.commandPrefix}${command.example.replaceAll('%s', context.username)})`
    )
  }
} satisfies ChatCommandHandler
