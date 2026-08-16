import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration.js'
import type { EventContext } from '../../spontaneous-events/common.js'
import { startUnscramble } from '../../spontaneous-events/events/unscramble.js'

export default class Unscramble extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'unscramble',
      triggers: ['unscramble', 'scramble'],
      description: 'Start an unscrambling event',
      example: `unscramble`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public) {
      return `${context.username}, can only start this event in public chat!`
    }

    const eventContext: EventContext = {
      application: context.app,
      eventHelper: context.eventHelper,
      logger: context.logger,
      broadcastMessage: (message) => context.sendFeedback(message)
    }

    const result = await startUnscramble(eventContext, Duration.seconds(30))
    return result.message
  }
}
