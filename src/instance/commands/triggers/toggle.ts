import { ChannelType } from '../../../common/application-event'
import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

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
    if (context.channelType !== ChannelType.OFFICER && !context.isAdmin) {
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
