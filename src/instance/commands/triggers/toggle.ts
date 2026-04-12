import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Toggle extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['toggle', 'disable'],
      description: 'Enable/disable commands',
      example: `toggle 8balls`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const userPermission = await context.message.user.permission()
    if (
      userPermission < Permission.Helper ||
      (userPermission === Permission.Helper && !context.app.core.commandsConfigurations.getAllowHelperToggle())
    ) {
      return `${context.username}, Command can only be executed in officer chat or by the bridge admin`
    }

    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    const query = context.args[0]
    const commands = context.allCommands
    const config = context.app.core.commandsConfigurations

    const command = commands.find((c) => c.triggers.includes(query.toLowerCase()))
    if (command == undefined) return `Command does not exist`

    let disabledCommands = config.getDisabledCommands()
    if (disabledCommands.includes(command.triggers[0].toLowerCase())) {
      disabledCommands = disabledCommands.filter((trigger) => trigger !== command.triggers[0].toLowerCase())
      config.setDisabledCommands(disabledCommands)
      return `Command ${query} is now enabled.`
    } else {
      disabledCommands.push(command.triggers[0].toLowerCase())
      config.setDisabledCommands(disabledCommands)
      return `Command ${query} is now disabled.`
    }
  }
}
