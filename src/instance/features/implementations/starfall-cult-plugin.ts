import type Application from '../../../application.js'
import { ChannelType, Color } from '../../../common/application-event.js'
import type { PluginInfo } from '../../../common/plugin-instance.js'
import PluginInstance from '../../../common/plugin-instance.js'
import { OfficialPlugins } from '../common/plugins-config.js'
import type { PluginsManager } from '../plugins-manager.js'

export default class StarfallCultPlugin extends PluginInstance {
  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, OfficialPlugins.StarfallCultReminder)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Send a reminder when the skyblock starfall cult gathers' }
  }

  onReady(): Promise<void> | void {
    let lastSkyblockDay = -1

    setInterval(() => {
      if (!this.enabled()) return

      const date = StarfallCultPlugin.getSkyblockTime()
      const currentSkyblockDay = date.day

      if (lastSkyblockDay === currentSkyblockDay) return
      lastSkyblockDay = currentSkyblockDay

      if ([7, 14, 21, 28].includes(currentSkyblockDay)) {
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          color: Color.Good,
          channels: [ChannelType.Public],

          username: undefined,
          message: `Reminder: Star Cult is here. Get that free x200 starfall!`
        })
      }
    }, 5000)
  }

  private enabled(): boolean {
    return this.pluginsManager.getConfig().data.starfallCultReminder
  }

  private static getSkyblockTime(): { day: number } {
    const HourInMillisecond = 50_000
    const DayInMilliseconds = 24 * HourInMillisecond
    const MonthInMillisecond = 31 * DayInMilliseconds
    const Year0 = 1_560_275_700_000

    const currentEpoch = Date.now() - Year0
    const day = (currentEpoch % MonthInMillisecond) / DayInMilliseconds + 1
    return {
      day: Math.floor(day)
    }
  }
}
