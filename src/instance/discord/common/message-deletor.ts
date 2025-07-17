import assert from 'node:assert'

import type { Client } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { ConfigManager } from '../../../common/config-manager.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'

export default class MessageDeleter {
  private static readonly DefaultExpiresSeconds = 15 * 60
  private static readonly CheckEveryMilliseconds = 5 * 1000
  private readonly config

  constructor(
    application: Application,
    logger: Logger,
    private readonly errorHandler: UnexpectedErrorHandler,
    private readonly client: Client
  ) {
    this.config = new ConfigManager<MessageDeleterConfig>(
      application,
      logger,
      application.getConfigFilePath('discord-temp-events.json'),
      {
        expireSeconds: MessageDeleter.DefaultExpiresSeconds,
        maxInteractions: 5,
        interactions: []
      }
    )

    setInterval(() => {
      this.clean()
    }, MessageDeleter.CheckEveryMilliseconds)
  }

  public getConfig(): ConfigManager<MessageDeleterConfig> {
    return this.config
  }

  public add(messages: DiscordMessage): void {
    this.config.data.interactions.push(messages)
    this.config.markDirty()
  }

  public clean(): void {
    const currentTime = Date.now()
    const newArray = []
    const tasks: Promise<unknown>[] = []

    // discard expired interactions first
    for (const interaction of this.config.data.interactions) {
      if (interaction.createdAt + this.config.data.expireSeconds * 1000 >= currentTime) {
        newArray.push(interaction)
        continue
      }

      tasks.push(...this.delete(interaction))
    }

    // discard overflowing old interactions
    newArray.sort((a, b) => b.createdAt - a.createdAt)
    while (newArray.length > this.config.data.maxInteractions) {
      const interaction = newArray.pop()
      assert(interaction)
      tasks.push(...this.delete(interaction))
    }

    if (newArray.length !== this.config.data.interactions.length) {
      this.config.data.interactions = newArray
      this.config.markDirty()
    }

    void Promise.all(tasks).catch(this.errorHandler.promiseCatch('deleting old interactions'))
  }

  private delete(interaction: DiscordMessage): Promise<unknown>[] {
    const tasks: Promise<unknown>[] = []

    for (const message of interaction.messages) {
      const task = this.client.channels
        .fetch(message.channelId)
        .then((channel) => {
          assert(channel?.isSendable())
          return channel.messages.fetch(message.messageId)
        })
        .then((message) => {
          assert(message)
          return message.delete()
        })
        .catch(this.errorHandler.promiseCatch(`deleting channel=${message.channelId},message=${message.messageId}`))

      tasks.push(task)
    }

    return tasks
  }
}

export interface MessageDeleterConfig {
  expireSeconds: number
  maxInteractions: number
  interactions: DiscordMessage[]
}

export interface DiscordMessage {
  createdAt: number
  messages: { channelId: string; messageId: string }[]
}
