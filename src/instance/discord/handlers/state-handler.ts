import assert from 'node:assert'

import { Status } from '../../../common/client-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type DiscordInstance from '../discord-instance.js'

export default class StateHandler extends EventHandler<DiscordInstance> {
  registerEvents(): void {
    this.clientInstance.client.on('ready', () => {
      this.onReady()
    })
  }

  private onReady(): void {
    assert(this.clientInstance.client.user)
    this.clientInstance.logger.info('Discord client ready, logged in as ' + this.clientInstance.client.user.tag)
    this.clientInstance.setAndBroadcastNewStatus(Status.Connected, 'Discord logged in')
  }
}
