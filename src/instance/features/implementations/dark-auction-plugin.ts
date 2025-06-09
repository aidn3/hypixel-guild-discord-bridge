import type Application from '../../../application.js'
import { ChannelType, Color } from '../../../common/application-event.js'
import type { PluginInfo } from '../../../common/plugin-instance.js'
import PluginInstance from '../../../common/plugin-instance.js'
import { OfficialPlugins } from '../common/plugins-config.js'
import type { PluginsManager } from '../plugins-manager.js'

export default class DarkAuctionPlugin extends PluginInstance {
  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, OfficialPlugins.DarkAuctionReminder)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Send a reminder when a skyblock dark auction is starting' }
  }

  onReady(): Promise<void> | void {
    let lastHourCheck = -1
    let lastMinuteCheck = -1

    setInterval(() => {
      if (!this.enabled()) return

      const date = new Date()
      const currentHour = date.getHours()
      const currentMinute = date.getMinutes()

      if (lastHourCheck === currentHour && lastMinuteCheck === currentMinute) return
      lastHourCheck = currentHour
      lastMinuteCheck = currentMinute

      if ([50, 54].includes(currentMinute)) {
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Good,

          username: undefined,
          message: `Dark Auction in ${55 - currentMinute} minutes!`
        })
      }
    }, 5000)
  }

  private enabled(): boolean {
    return this.pluginsManager.getConfig().data.darkAuctionReminder
  }
}
