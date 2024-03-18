import { ChannelType, EventType, InstanceType } from '../common/application-event'
import type { PluginContext, PluginInterface } from '../common/plugins'
import { ColorScheme } from '../instance/discord/common/discord-config'

export default {
  onRun(context: PluginContext): void {
    let lastSkyblockDay = -1

    setInterval(() => {
      const date = getSkyblockTime()
      const currentSkyblockDay = date.day

      if (lastSkyblockDay === currentSkyblockDay) return
      lastSkyblockDay = currentSkyblockDay

      if ([7, 14, 21, 28].includes(currentSkyblockDay)) {
        context.application.emit('event', {
          localEvent: true,
          instanceType: InstanceType.MAIN,
          instanceName: InstanceType.MAIN,
          name: EventType.AUTOMATED,
          severity: ColorScheme.GOOD,
          channelType: ChannelType.PUBLIC,
          username: undefined,
          message: `Reminder: Star Cult is here. Get that free x200 starfall!`,
          removeLater: false
        })
      }
    }, 5000)
  }
} satisfies PluginInterface

function getSkyblockTime(): { day: number } {
  const HOUR_MS = 50_000
  const DAY_MS = 24 * HOUR_MS
  const MONTH_MS = 31 * DAY_MS
  const YEAR_0 = 1_560_275_700_000

  const currentEpoch = Date.now() - YEAR_0
  const day = (currentEpoch % MONTH_MS) / DAY_MS + 1
  return {
    day: Math.floor(day)
  }
}
