import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Toggled extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['toggled', 'disabled'],
      description: 'Show disabled commands',
      example: `disabled`
    })
  }

  handler(context: ChatCommandContext): string {
    const disabledCommands = context.app.core.commandsConfigurations.getDisabledCommands()
    if (disabledCommands.length === 0) {
      return `${context.username}, there are no disabled commands! Use ${context.commandPrefix}disable`
    }

    return `Disabled command(s): ${disabledCommands.join(', ')}`
  }
}
