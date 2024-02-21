import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { SCOPE } from '../../../common/ClientInstance'

export default {
  name: 'Toggle',
  triggers: ['toggle'],
  description: 'Enable/disable commands',
  example: `toggle 8balls`,
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    if (context.scope !== SCOPE.OFFICER || context.username !== context.clientInstance.config.adminUsername) {
      return `${context.username}, Command can only be executed in officer chat or by the bridge admin`
    }

    if (context.args.length <= 0) {
      return `Example: ${context.clientInstance.config.commandPrefix}${this.example}`
    }

    const query = context.args[0]
    const command = context.allCommands.find((c) => c.triggers.includes(query[0].toLowerCase()))
    if (command == undefined) {
      return `Command does not exist`
    }

    command.enabled = !command.enabled
    return `Command ${command.triggers[0]} is now ${command.enabled ? 'enabled' : 'disabled'}.`
  }
} satisfies ChatCommandHandler
