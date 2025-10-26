import type { Client } from 'discord.js'

import type { InstanceType } from '../../../common/application-event.js'
import { Status } from '../../../common/connectable-instance.js'
import SubInstance from '../../../common/sub-instance'
import type DiscordInstance from '../discord-instance.js'

export default class StateHandler extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  override registerEvents(client: Client): void {
    client.on('clientReady', (client) => {
      this.logger.info('Discord client ready, logged in as ' + client.user.tag)
      this.clientInstance.setAndBroadcastNewStatus(Status.Connected, 'Discord logged in')
    })
  }
}
