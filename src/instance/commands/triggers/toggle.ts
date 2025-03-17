import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Toggle extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Toggle',
      triggers: ['toggle'],
      description: 'Enable/disable commands',
      example: `toggle 8balls`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.permission < Permission.Helper) {
      return `${context.username}, Command can only be executed in officer chat or by the bridge admin`
    }

    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    const query = context.args[0].toLowerCase()
    const command = context.allCommands.find((c) => c.triggers.includes(query))
    if (command == undefined) {
      return `Command does not exist`
    }

    command.enabled = !command.enabled
    return `Command ${command.triggers[0]} is now ${command.enabled ? 'enabled' : 'disabled'}.`
  }
}
