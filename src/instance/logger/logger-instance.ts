import { WebhookClient } from 'discord.js'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance } from '../../common/client-instance.js'
import { escapeDiscord } from '../../util/shared-util.js'

export default class LoggerInstance extends ClientInstance<undefined> {
  private readonly client: WebhookClient

  constructor(app: Application, instanceName: string, sendUrl: string) {
    super(app, instanceName, InstanceType.Logger, undefined)
    this.client = new WebhookClient({ url: sendUrl })

    this.app.on('chat', (event) => {
      const displayUsername =
        event.instanceType === InstanceType.Discord && event.replyUsername !== undefined
          ? `${event.username}▸${event.replyUsername}`
          : event.username

      void this.send(
        `[chat][${event.instanceName}][type=${event.channelType}] ${displayUsername}: ${event.message}`
      ).catch(this.errorHandler.promiseCatch('handling chat event'))
    })
    this.app.on('profanityWarning', (event) => {
      void this.send(
        // filteredMessage is used instead of the original message since discord auto-mod might get triggered and deletes the webhook
        `[profanityWarning][${event.instanceName}][type=${event.channelType}][username=${event.username}]: ${event.filteredMessage}`
      ).catch(this.errorHandler.promiseCatch('handling profanityWarning event'))
    })
    this.app.on('guildPlayer', (event) => {
      void this.send(`[guildPlayer][${event.type}][${event.instanceName}] ${event.username}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildPlayer event')
      )
    })
    this.app.on('guildGeneral', (event) => {
      void this.send(`[guildGeneral][${event.type}][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling guildGeneral event')
      )
    })
    this.app.on('minecraftChatEvent', (event) => {
      void this.send(`[minecraftChatEvent][${event.type}][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling minecraftChatEvent event')
      )
    })
    this.app.on('broadcast', (event) => {
      void this.send(`[broadcast][${event.instanceName}] ${event.username}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling broadcast event')
      )
    })
    this.app.on('command', (event) => {
      void this.send(
        `[command][${event.instanceName}][${event.channelType}][username=${event.username}][command=${event.commandName}] ${event.fullCommand}: ${event.commandResponse}`
      ).catch(this.errorHandler.promiseCatch('handling command event'))
    })
    this.app.on('commandFeedback', (event) => {
      void this.send(
        `[commandFeedback][${event.instanceName}][${event.channelType}][username=${event.username}][command=${event.commandName}] ${event.fullCommand}: ${event.commandResponse}`
      ).catch(this.errorHandler.promiseCatch('handling commandFeedback event'))
    })

    this.app.on('instanceStatus', (event) => {
      void this.send(`[instance][${event.instanceName}] ${event.status}: ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling instance event')
      )
    })
    this.app.on('selfBroadcast', (event) => {
      void this.send(`[selfBroadcast][${event.instanceName}] Instance broadcasting its existence.`).catch(
        this.errorHandler.promiseCatch('handling selfBroadcast event')
      )
    })
    this.app.on('statusMessage', (event) => {
      void this.send(`[statusMessage][${event.instanceName}] ${event.message}`).catch(
        this.errorHandler.promiseCatch('handling statusMessage event')
      )
    })

    this.app.on('reconnectSignal', (event) => {
      void this.send(`[reconnectSignal][target=${event.targetInstanceName}] Reconnect signal has been sent.`).catch(
        this.errorHandler.promiseCatch('handling reconnectSignal event')
      )
    })
    this.app.on('shutdownSignal', (event) => {
      void this.send(
        `[shutdownSignal][target=${event.targetInstanceName}, restart=${event.restart}] Restart signal has been sent.`
      ).catch(this.errorHandler.promiseCatch('handling shutdownSignal event'))
    })

    this.app.on('minecraftSelfBroadcast', (event) => {
      void this.send(`[minecraftSelfBroadcast][${event.instanceName}] ${event.username}/${event.uuid}`).catch(
        this.errorHandler.promiseCatch('handling minecraftSelfBroadcast event')
      )
    })
    this.app.on('minecraftSend', (event) => {
      void this.send(`[minecraftSend][target=${event.targetInstanceName}] ${event.command}`).catch(
        this.errorHandler.promiseCatch('handling minecraftSend event')
      )
    })
  }

  private async send(message: string): Promise<void> {
    await this.client.send({
      username: this.instanceName,
      content: escapeDiscord(message)
    })
  }

  connect(): void {
    // do nothing
  }
}
