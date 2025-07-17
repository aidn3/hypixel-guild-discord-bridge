import type { Client } from 'discord.js'
import { ActivityType } from 'discord.js'

import type { InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type DiscordInstance from '../discord-instance.js'

export default class StatusHandler extends EventHandler<DiscordInstance, InstanceType.Discord, Client> {
  override registerEvents(client: Client): void {
    client.on('ready', (client) => {
      client.user.setPresence({
        status: 'online',
        activities: [{ name: 'Connecting Hypixel guilds with Discord!', type: ActivityType.Custom }]
      })
    })
  }
}
