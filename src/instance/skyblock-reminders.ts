import assert from 'node:assert'

import type Application from '../application'
import { ChannelType, Color, InstanceType } from '../common/application-event'
import { Instance } from '../common/instance'

export class SkyblockReminders extends Instance<InstanceType.Utility> {
  public static readonly DefaultDarkAuctionMessage = 'Dark Auction in {minutes} minute(s)!'
  public static readonly DefaultStarfallMessage = `Reminder: Star Cult is here. Get that free x200 starfall!`

  constructor(application: Application) {
    super(application, 'skyblock-reminders', InstanceType.Utility)

    this.startDarkAuctionReminder()
    this.startStarfallCultReminder()
  }

  private startDarkAuctionReminder(): void {
    let lastHourCheck = -1
    let lastMinuteCheck = -1

    setInterval(() => {
      if (!this.application.core.applicationConfigurations.getDarkAuctionReminder()) return

      const date = new Date()
      const currentHour = date.getHours()
      const currentMinute = date.getMinutes()

      if (lastHourCheck === currentHour && lastMinuteCheck === currentMinute) return
      lastHourCheck = currentHour
      lastMinuteCheck = currentMinute

      if ([50, 54].includes(currentMinute)) {
        const remainingMinutes = 55 - currentMinute
        assert.ok(remainingMinutes > 0)

        const message = this.application.language.data.darkAuctionReminder.replaceAll(
          '{minutes}',
          remainingMinutes.toString(10)
        )

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Good,

          user: undefined,
          message: message
        })
      }
    }, 5000)
  }

  private startStarfallCultReminder(): void {
    let lastSkyblockDay = -1

    setInterval(() => {
      if (!this.application.core.applicationConfigurations.getStarfallCultReminder()) return

      const date = SkyblockReminders.getSkyblockTime()
      const currentSkyblockDay = date.day

      if (lastSkyblockDay === currentSkyblockDay) return
      lastSkyblockDay = currentSkyblockDay

      if ([7, 14, 21, 28].includes(currentSkyblockDay)) {
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          color: Color.Good,
          channels: [ChannelType.Public],

          user: undefined,
          message: this.application.language.data.starfallReminder
        })
      }
    }, 5000)
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
