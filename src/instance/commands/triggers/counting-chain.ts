import { ChannelType } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import type { EventContext } from '../../spontaneous-events/common'
import { startCountingChain } from '../../spontaneous-events/events/counting-chain'

export default class CountingChain extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['counting', 'countingchain', 'countchain'],
      description: 'Start a counting chain event',
      example: `counting`
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

    const result = await startCountingChain(eventContext, Duration.seconds(10))
    return result.message
  }
}
