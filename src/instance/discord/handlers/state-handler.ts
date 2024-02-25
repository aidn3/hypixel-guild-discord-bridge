import assert from 'node:assert'

import EventHandler from '../../../common/event-handler'
import type DiscordInstance from '../discord-instance'

export default class StateHandler extends EventHandler<DiscordInstance> {
  registerEvents(): void {
    this.clientInstance.client.on('ready', () => {
      this.onReady()
    })
  }

  private onReady(): void {
    assert(this.clientInstance.client.user)
    this.clientInstance.logger.info('Discord client ready, logged in as ' + this.clientInstance.client.user.tag)
  }
}
