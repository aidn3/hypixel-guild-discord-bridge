import { Client, Message, WebhookClient } from 'discord.js'

import Application from '../../Application'
import { ClientInstance, LOCATION, SCOPE } from '../../common/ClientInstance'
import { ChatEvent } from '../../common/ApplicationEvent'
import { cleanMessage, escapeDiscord } from '../../util/DiscordMessageUtil'
import WebhookConfig from './common/WebhookConfig'

export default class WebhookInstance extends ClientInstance<WebhookConfig> {
  private readonly discordBot: Client | null
  private readonly client: WebhookClient | undefined

  constructor (app: Application, instanceName: string, discordBot: Client | null, config: WebhookConfig) {
    super(app, instanceName, LOCATION.WEBHOOK, config)

    this.discordBot = discordBot
    if (config.sendUrl !== undefined) this.client = new WebhookClient({ url: config.sendUrl })

    this.app.on('chat', (event: ChatEvent): void => {
      if (event.instanceName === this.instanceName) return
      if (event.scope !== SCOPE.PUBLIC) return

      // TODO: integrate instanceName into webhook messages
      const displayUsername = event.replyUsername !== undefined ? `${event.username}▸${event.replyUsername}` : event.username

      void this.client?.send({
        content: escapeDiscord(event.message),
        username: displayUsername,
        avatarURL: `https://mc-heads.net/avatar/${encodeURIComponent(event.username)}`
      })
    })
  }

  async connect (): Promise<void> {
    if (this.config.receiveId !== undefined) {
      if (this.discordBot != null) {
        this.discordBot.on('messageCreate', message => {
          this.onChatMessage(message)
        })
      } else {
        this.logger.warn('Discord instance is not setup. Webhook can not receive messages. Sending works though')
      }
    }
  }

  private onChatMessage (event: Message<any>): void {
    if (event?.webhookId !== this.config.receiveId) return

    const content = cleanMessage(event)
    if (content.length === 0) return

    if (this.app.punishedUsers.mutedTill(event.member?.displayName ?? event.author.displayName) !== undefined) {
      this.logger.debug(`${event.author.username} is muted. ignoring this webhook message.`)
      return
    }

    this.app.emit('chat', {
      localEvent: true,
      instanceName: this.instanceName,
      location: LOCATION.WEBHOOK,
      scope: SCOPE.PUBLIC,
      channelId: undefined,
      username: event.author.username,
      replyUsername: undefined, // TODO: find way to get replyUsername for webhooks (if possible at all)
      message: content
    })
  }
}
