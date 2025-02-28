import { ChannelType, Color } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugin.js'

/* NOTICE
THIS IS AN OPTIONAL PLUGIN. TO DISABLE IT, REMOVE THE PATH FROM 'config.yaml' PLUGINS
*/

export default {
  onRun(context: PluginContext): void {
    let lastSkyblockDay = -1

    setInterval(() => {
      const date = getSkyblockTime()
      const currentSkyblockDay = date.day

      if (lastSkyblockDay === currentSkyblockDay) return
      lastSkyblockDay = currentSkyblockDay

      if ([7, 14, 21, 28].includes(currentSkyblockDay)) {
        context.application.emit('broadcast', {
          ...context.eventHelper.fillBaseEvent(),

          color: Color.Good,
          channels: [ChannelType.Public],

          username: undefined,
          message: `Reminder: Star Cult is here. Get that free x200 starfall!`
        })
      }
    }, 5000)
  }
} satisfies PluginInterface

function getSkyblockTime(): { day: number } {
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
