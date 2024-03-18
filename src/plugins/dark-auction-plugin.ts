import { ChannelType, EventType, InstanceType } from '../common/application-event'
import type { PluginContext, PluginInterface } from '../common/plugins'
import { ColorScheme } from '../instance/discord/common/discord-config'
import { antiSpamString } from '../util/shared-util'

export default {
  onRun(context: PluginContext): void {
    let lastHourCheck = -1
    let lastMinuteCheck = -1

    setInterval(() => {
      const date = new Date()
      const currentHour = date.getHours()
      const currentMinute = date.getMinutes()

      if (lastHourCheck === currentHour && lastMinuteCheck === currentMinute) return
      lastHourCheck = currentHour
      lastMinuteCheck = currentMinute

      if ([50, 54].includes(currentMinute)) {
        context.application.emit('event', {
          localEvent: true,
          instanceType: InstanceType.MAIN,
          instanceName: InstanceType.MAIN,
          name: EventType.AUTOMATED,
          severity: ColorScheme.GOOD,
          channelType: ChannelType.PUBLIC,
          username: undefined,
          message: `Dark Auction in ${55 - currentMinute} minutes! @${antiSpamString()}`,
          removeLater: false
        })
      }
    }, 5000)
  }
} satisfies PluginInterface
