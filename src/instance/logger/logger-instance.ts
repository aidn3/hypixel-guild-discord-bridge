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
        event.replyUsername == undefined ? event.username : `${event.username}▸${event.replyUsername}`

      void this.send(`[chat][${event.instanceName}][type=${event.channelType}] ${displayUsername}: ${event.message}`)
    })
    this.app.on('event', (event) => {
      void this.send(`[event][${event.eventType}][${event.instanceName}] ${event.username}: ${event.message}`)
    })
    this.app.on('command', (event) => {
      void this.send(
        `[command][${event.instanceName}][${event.channelType}][username=${event.username}][command=${event.commandName}] ${event.fullCommand}: ${event.commandResponse}`
      )
    })

    this.app.on('instance', (event) => {
      void this.send(`[instance][${event.instanceName}] ${event.type}: ${event.message}`)
    })
    this.app.on('selfBroadcast', (event) => {
      void this.send(`[selfBroadcast][${event.instanceName}] Instance broadcasting its existence.`)
    })
    this.app.on('statusMessage', (event) => {
      void this.send(`[statusMessage][${event.instanceName}] ${event.message}`)
    })

    this.app.on('reconnectSignal', (event) => {
      void this.send(`[reconnectSignal][target=${event.targetInstanceName}] Reconnect signal has been sent.`)
    })
    this.app.on('shutdownSignal', (event) => {
      void this.send(
        `[shutdownSignal][target=${event.targetInstanceName}, restart=${event.restart}] Restart signal has been sent.`
      )
    })

    this.app.on('minecraftSelfBroadcast', (event) => {
      void this.send(`[minecraftSelfBroadcast][${event.instanceName}] ${event.username}/${event.uuid}`)
    })
    this.app.on('minecraftSend', (event) => {
      void this.send(`[minecraftSend][target=${event.targetInstanceName}] ${event.command}`)
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
