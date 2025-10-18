import type { Client } from 'discord.js'
import { escapeMarkdown } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { InstanceType } from '../../../common/application-event.js'
import type { ConfigManager } from '../../../common/config-manager.js'
import { Status } from '../../../common/connectable-instance.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { DiscordConfig } from '../common/discord-config.js'
import type DiscordInstance from '../discord-instance.js'

export default class LoggerManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private readonly config: ConfigManager<DiscordConfig>

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    config: ConfigManager<DiscordConfig>,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.config = config

    this.application.on('chat', (event) => {
      const displayUsername =
        event.instanceType === InstanceType.Discord && event.replyUsername !== undefined
          ? `${event.user.displayName()}▸${event.replyUsername}`
          : event.user.displayName()

      void this.send(`Chat > ${event.channelType} ${event.instanceName} ${displayUsername}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling chat event')
      )
    })
    this.application.on('guildPlayer', (event) => {
      void this.send(`Guild > ${event.instanceName}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
    this.application.on('guildGeneral', (event) => {
      void this.send(`Guild > ${event.instanceName}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildGeneral event')
      )
    })
    this.application.on('broadcast', (event) => {
      void this.send(`Broadcast > ${event.user ? `${event.user.displayName()}: ` : ''}${event.message}`).catch(
        this.errorHandler.promiseCatch('handling broadcast event')
      )
    })
    this.application.on('command', (event) => {
      void this.send(`Command > ${event.commandResponse}`).catch(
        this.errorHandler.promiseCatch('handling command event')
      )
    })
    this.application.on('commandFeedback', (event) => {
      void this.send(`Command > ${event.commandResponse}`).catch(
        this.errorHandler.promiseCatch('handling commandFeedback event')
      )
    })

    this.application.on('instanceStatus', (event) => {
      if (event.instanceName === this.clientInstance.instanceName) return

      void this.send(`Instance > ${event.instanceName}: ${event.status}, ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling instance event')
      )
    })
    this.application.on('instanceAnnouncement', (event) => {
      void this.send(`Instance > ${event.instanceName}: Instance broadcasting its existence.`).catch(
        this.errorHandler.promiseCatch('handling instanceAnnouncement event')
      )
    })
    this.application.on('instanceMessage', (event) => {
      void this.send(`Instance > ${event.instanceName}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling instanceMessage event')
      )
    })

    this.application.on('instanceSignal', (event) => {
      void this.send(
        `Instance [${event.instanceName}] > ${event.targetInstanceName.join(', ')} instance(s) received a signal with flag=${event.type}.`
      ).catch(this.errorHandler.promiseCatch('handling instanceSignal event'))
    })

    this.application.on('minecraftSelfBroadcast', (event) => {
      void this.send(`Instance [${event.instanceName}] > Minecraft instance ${event.username}/${event.uuid}`).catch(
        this.errorHandler.promiseCatch('handling minecraftSelfBroadcast event')
      )
    })
    this.application.on('minecraftSend', (event) => {
      // Too spammy events that are automatically sent every half a minute
      if (event.command === '/guild list' || event.command === '/guild online') return

      void this.send(
        `Instance [${event.instanceName}]> [target=${event.targetInstanceName.join(', ')}] ${event.command}`
      ).catch(this.errorHandler.promiseCatch('handling minecraftSend event'))
    })
  }

  private async send(message: string): Promise<void> {
    const currentStatus = this.clientInstance.currentStatus()
    if (currentStatus === Status.Ended) return

    const channels = this.config.data.loggerChannelIds
    for (const channelId of channels) {
      try {
        // TODO: properly reference client
        // @ts-expect-error client is private variable
        const channel = await this.clientInstance.client.channels.fetch(channelId)
        if (!channel?.isSendable()) continue
        await channel.send({ content: escapeMarkdown(message), allowedMentions: { parse: [] } })
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }
  }
}
