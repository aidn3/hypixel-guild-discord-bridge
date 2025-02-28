import assert from 'node:assert'

import type { InstanceType } from '../../../common/application-event.js'
import { Status } from '../../../common/client-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type DiscordInstance from '../discord-instance.js'

export default class StateHandler extends EventHandler<DiscordInstance, InstanceType.Discord> {
  registerEvents(): void {
    this.clientInstance.client.on('ready', () => {
      this.onReady()
    })
  }

  private onReady(): void {
    assert(this.clientInstance.client.user)
    this.logger.info('Discord client ready, logged in as ' + this.clientInstance.client.user.tag)
    this.clientInstance.setAndBroadcastNewStatus(Status.Connected, 'Discord logged in')
  }
}
