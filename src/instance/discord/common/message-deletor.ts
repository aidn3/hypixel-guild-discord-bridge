import type { Client } from 'discord.js'
import { Routes } from 'discord.js'
import PromiseQueue from 'promise-queue'

import type Application from '../../../application'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { DiscordMessage } from '../../../core/discord/discord-temporarily-interactions'
import Duration from '../../../utility/duration'

export default class MessageDeleter {
  private static readonly CheckEvery = Duration.seconds(5)
  private readonly queue = new PromiseQueue(1)

  constructor(
    private readonly application: Application,
    private readonly errorHandler: UnexpectedErrorHandler,
    private readonly client: Client
  ) {
    setInterval(() => {
      const totalQueue = this.queue.getPendingLength() + this.queue.getQueueLength()
      if (totalQueue === 0) this.queueClean()
    }, MessageDeleter.CheckEvery.toMilliseconds())
  }

  public add(messages: DiscordMessage[]): void {
    this.application.core.discordTemporarilyInteractions.add(messages)
    this.queueClean()
  }

  private queueClean(): void {
    void this.queue
      .add(() => {
        return this.clean().catch(this.errorHandler.promiseCatch('deleting old interactions'))
      })
      .catch(this.errorHandler.promiseCatch('queue failed when trying to delete old interactions'))
  }

  public async clean(): Promise<void> {
    const expiredInteractions = this.application.core.discordTemporarilyInteractions.findToDelete()

    const bulk = new Map<string, string[]>()
    for (const expiredInteraction of expiredInteractions) {
      let messages = bulk.get(expiredInteraction.channelId)
      if (messages === undefined) {
        messages = []
        bulk.set(expiredInteraction.channelId, messages)
      }

      messages.push(expiredInteraction.messageId)
    }

    const tasks = []
    for (const [channelId, messages] of bulk) {
      for (const message of messages) {
        /*
         * direct rest api is used since the library client requires
         * to first fetch the channel THEN do the delete request.
         * this cuts it down to a single request.
         *
         * Although it is possible to bulk delete messages, it REQUIRES ManageMessages permission in that channel,
         * even when the messages are owned by the user.
         * And it has limitations such as: messages must not be older than 14 days and must be between 2 and 100. etc.
         * Right now, it doesn't make sense to create a complicated setup to ensure everything is working optimally.
         * So it is left for the future when it is needed.
         */
        const task = this.client.rest
          .delete(Routes.channelMessage(channelId, message))
          .catch(this.errorHandler.promiseCatch(`deleting temporarily event channel=${channelId},message=${message}`))
        tasks.push(task)
      }
    }

    await Promise.allSettled(tasks)

    const messages = expiredInteractions.map((message) => message.messageId)
    this.application.core.discordTemporarilyInteractions.remove(messages)
  }
}
