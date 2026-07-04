import type { ChatCommandContext, CommandId } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'

export default class Toggled extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'toggled',
      triggers: ['toggled', 'disabled'],
      description: 'Show disabled commands',
      example: `disabled`
    })
  }

  handler(context: ChatCommandContext): string {
    const disabledCommands = context.app.commandsInstance.database.allCommands().filter((command) => !command.enabled)
    const mappedCommands = new Map<CommandId, ChatCommandHandler>()
    for (const command of context.allCommands) {
      mappedCommands.set(command.id, command)
    }

    const relevantCommands = new Set<ChatCommandHandler>()
    for (const disabledCommand of disabledCommands) {
      const disabledCommandHandler = mappedCommands.get(disabledCommand.id)
      if (disabledCommandHandler !== undefined) relevantCommands.add(disabledCommandHandler)
    }

    const disabledTriggers: string[] = []
    for (const relevantCommand of relevantCommands) {
      disabledTriggers.push(relevantCommand.triggers[0])
    }

    if (disabledTriggers.length === 0) {
      return `${context.username}, there are no disabled commands! Use ${context.commandPrefix}disable`
    }

    return `Disabled command(s): ${disabledTriggers.join(', ')}`
  }
}
