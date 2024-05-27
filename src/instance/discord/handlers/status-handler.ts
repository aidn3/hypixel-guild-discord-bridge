import assert from 'node:assert'

import { ActivityType } from 'discord.js'

import EventHandler from '../../../common/event-handler.js'
import type DiscordInstance from '../discord-instance.js'

export default class StatusHandler extends EventHandler<DiscordInstance> {
  registerEvents(): void {
    this.clientInstance.client.on('ready', () => {
      this.onReady()
    })
  }

  private onReady(): void {
    assert(this.clientInstance.client.user)

    this.clientInstance.client.user.setPresence({
      status: 'online',
      activities: [{ name: 'Connecting Hypixel guilds with Discord!', type: ActivityType.Custom }]
    })
  }
}
