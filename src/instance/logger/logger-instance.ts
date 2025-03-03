import { escapeMarkdown, WebhookClient } from 'discord.js'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { Instance } from '../../common/instance.js'

export default class LoggerInstance extends Instance<undefined, InstanceType.Logger> {
  private readonly client: WebhookClient

  constructor(app: Application, instanceName: string, sendUrl: string) {
    super(app, instanceName, InstanceType.Logger, undefined)
    this.client = new WebhookClient({ url: sendUrl })

    this.application.on('chat', (event) => {
      const displayUsername =
        event.instanceType === InstanceType.Discord && event.replyUsername !== undefined
          ? `${event.username}▸${event.replyUsername}`
          : event.username

      void this.send(
        `[chat][${event.instanceName}][type=${event.channelType}] ${displayUsername}: ${event.message}`
      ).catch(this.errorHandler.promiseCatch('handling chat event'))
    })
    this.application.on('profanityWarning', (event) => {
      void this.send(
        // filteredMessage is used instead of the original message since discord auto-mod might get triggered and deletes the webhook
        `[profanityWarning][${event.instanceName}][type=${event.channelType}][username=${event.username}]: ${event.filteredMessage}`
      ).catch(this.errorHandler.promiseCatch('handling profanityWarning event'))
    })
    this.application.on('guildPlayer', (event) => {
      void this.send(`[guildPlayer][${event.type}][${event.instanceName}] ${event.username}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
    this.application.on('guildGeneral', (event) => {
      void this.send(`[guildGeneral][${event.type}][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildGeneral event')
      )
    })
    this.application.on('minecraftChatEvent', (event) => {
      void this.send(`[minecraftChatEvent][${event.type}][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling minecraftChatEvent event')
      )
    })
    this.application.on('broadcast', (event) => {
      void this.send(`[broadcast][${event.instanceName}] ${event.username}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling broadcast event')
      )
    })
    this.application.on('command', (event) => {
      void this.send(
        `[command][${event.instanceName}][${event.channelType}][username=${event.username}][command=${event.commandName}] ${event.fullCommand}: ${event.commandResponse}`
      ).catch(this.errorHandler.promiseCatch('handling command event'))
    })
    this.application.on('commandFeedback', (event) => {
      void this.send(
        `[commandFeedback][${event.instanceName}][${event.channelType}][username=${event.username}][command=${event.commandName}] ${event.fullCommand}: ${event.commandResponse}`
      ).catch(this.errorHandler.promiseCatch('handling commandFeedback event'))
    })

    this.application.on('instanceStatus', (event) => {
      void this.send(`[instance][${event.instanceName}] ${event.status}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling instance event')
      )
    })
    this.application.on('selfBroadcast', (event) => {
      void this.send(`[selfBroadcast][${event.instanceName}] Instance broadcasting its existence.`).catch(
        this.errorHandler.promiseCatch('handling selfBroadcast event')
      )
    })
    this.application.on('statusMessage', (event) => {
      void this.send(`[statusMessage][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling statusMessage event')
      )
    })

    this.application.on('reconnectSignal', (event) => {
      void this.send(`[reconnectSignal][target=${event.targetInstanceName}] Reconnect signal has been sent.`).catch(
        this.errorHandler.promiseCatch('handling reconnectSignal event')
      )
    })
    this.application.on('shutdownSignal', (event) => {
      void this.send(
        `[shutdownSignal][target=${event.targetInstanceName}, restart=${event.restart}] Restart signal has been sent.`
      ).catch(this.errorHandler.promiseCatch('handling shutdownSignal event'))
    })

    this.application.on('minecraftSelfBroadcast', (event) => {
      void this.send(`[minecraftSelfBroadcast][${event.instanceName}] ${event.username}/${event.uuid}`).catch(
        this.errorHandler.promiseCatch('handling minecraftSelfBroadcast event')
      )
    })
    this.application.on('minecraftSend', (event) => {
      // Too spammy events that are automatically sent every half a minute
      if (event.command === '/guild list' || event.command === '/guild online') return

      void this.send(`[minecraftSend][target=${event.targetInstanceName}] ${event.command}`).catch(
        this.errorHandler.promiseCatch('handling minecraftSend event')
      )
    })
  }

  private async send(message: string): Promise<void> {
    await this.client.send({
      username: this.instanceName,
      content: escapeMarkdown(message)
    })
  }
}
