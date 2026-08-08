import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'

export default class Toggle extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'toggle',
      triggers: ['toggle', 'disable'],
      description: 'Enable/disable commands',
      example: `toggle 8balls`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const config = context.app.commandsInstance.commandsConfigurations
    const userPermission = await context.message.user.permission()
    if (
      userPermission < Permission.Helper ||
      (userPermission === Permission.Helper && !config.getAllowHelperToggle())
    ) {
      return `${context.username}, Command can only be executed in officer chat or by the bridge admin`
    }

    if (context.args.length <= 0) {
      return this.getExample(context.commandPrefix)
    }

    const query = context.args[0]
    const commands = context.allCommands
    const database = context.app.commandsInstance.database

    const command = commands.find((c) => c.triggers.includes(query.toLowerCase()))
    if (command == undefined) return `Command does not exist`

    const newStatus = database.toggleCommandEnabled(command.id)
    return newStatus ? `Command ${query} is now enabled.` : `Command ${query} is now disabled.`
  }
}
