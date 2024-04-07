import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'

export default class Help extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Help',
      triggers: ['help', 'command', 'commands', 'cmd', 'cmds'],
      description: 'Shows a command description and an example about its usage',
      example: `help 8balls`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.args.length <= 0) {
      return `Commands: ${context.allCommands.map((command) => command.name).join(', ')}`
    }

    const query = context.args[0].toLowerCase()
    const command = context.allCommands.find((c) => c.triggers.includes(query))
    if (command == undefined) {
      return `That command does not exist, use ${context.commandPrefix}${this.triggers[0]}`
    }

    return (
      `${command.name}: ${command.description} ` +
      `(${context.commandPrefix}${command.example.replaceAll('%s', context.username)})`
    )
  }
}
