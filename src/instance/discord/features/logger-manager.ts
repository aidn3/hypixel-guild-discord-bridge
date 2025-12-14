import type { Client } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { GuildPlayerEventType } from '../../../common/application-event.js'
import { Status } from '../../../common/connectable-instance.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type DiscordInstance from '../discord-instance.js'

export default class LoggerManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.application.on('guildPlayer', (event) => {
      if (event.type == GuildPlayerEventType.Online || event.type == GuildPlayerEventType.Offline) return

      void this.send(`Guild > ${event.instanceName}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
  }

  private async send(message: string): Promise<void> {
    const currentStatus = this.clientInstance.currentStatus()
    if (currentStatus === Status.Ended) return

    const config = this.application.core.discordConfigurations
    const channels = config.getLoggerChannelIds()
    const client = this.clientInstance.getClient()

    for (const channelId of channels) {
      try {
        const channel = await client.channels.fetch(channelId)
        if (!channel?.isSendable()) continue
        await channel.send({ content: escapeMarkdown(message), allowedMentions: { parse: [] } })
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }
  }
}
