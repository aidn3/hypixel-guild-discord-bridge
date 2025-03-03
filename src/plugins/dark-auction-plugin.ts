import { ChannelType, Color } from '../common/application-event.js'
import PluginInstance from '../common/plugin-instance.js'
import { antiSpamString } from '../util/shared-util.js'

/* NOTICE
THIS IS AN OPTIONAL PLUGIN. TO DISABLE IT, REMOVE THE PATH FROM 'config.yaml' PLUGINS
*/
export default class DarkAuctionPlugin extends PluginInstance {
  onReady(): Promise<void> | void {
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
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Good,

          username: undefined,
          message: `Dark Auction in ${55 - currentMinute} minutes! @${antiSpamString()}`
        })
      }
    }, 5000)
  }
}
