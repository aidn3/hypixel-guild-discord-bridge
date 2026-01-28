import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { PlaceholderContext } from '../../../core/placeholder/common'
import Duration from '../../../utility/duration'

export default class Placeholder extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['placeholder', 'ph'],
      description: 'Resolve a placeholder',
      example: 'ph SKYBLOCK_LEVEL'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const placeholderContext = {
      application: context.app,
      startTime: Date.now() - Duration.minutes(5).toMilliseconds(),
      cachedPlaceholders: new Map<string, string>(),
      customPlaceholders: {},
      throwOnAnyFail: false,
      user: context.message.user
    } satisfies PlaceholderContext
    const query = context.args.join(' ')

    return await context.app.core.placeHolder.resolvePlaceholder(placeholderContext, query)
  }
}
