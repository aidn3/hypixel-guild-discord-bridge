import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration.js'
import type { EventContext } from '../../spontaneous-events/common.js'
import { startCountingChain } from '../../spontaneous-events/events/counting-chain.js'

export default class CountingChain extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'counting-chain',
      triggers: ['counting', 'countingchain', 'countchain'],
      description: 'Start a counting chain event',
      example: `counting`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.channelType !== ChannelType.Public) {
      return context.app.i18n.t(($) => $['commands.countingchain.wrong-chat'], { username: context.username })
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
