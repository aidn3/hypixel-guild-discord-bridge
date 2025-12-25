import assert from 'node:assert'

import type Application from '../application'
import { ChannelType, Color, InstanceType } from '../common/application-event'
import { Instance } from '../common/instance'
import Duration from '../utility/duration'
import { setIntervalAsync } from '../utility/scheduling'
import { sleep } from '../utility/shared-utility'
import { getNextSkyblockEvents, type SkyblockEventKey, type SkyblockEventNext } from '../utility/skyblock-calendar'

export class SkyblockReminders extends Instance<InstanceType.Utility> {
  public static readonly DefaultDarkAuctionMessage = 'Dark Auction in {minutes} minute(s)!'
  public static readonly DefaultStarfallMessage = `Reminder: Star Cult is here. Get that free x200 starfall!`

  private readonly lastSkyblockEventNotifications = new Map<
    SkyblockEventKey,
    { startTimestamp: number; minutes: number }
  >()

  constructor(application: Application) {
    super(application, 'skyblock-reminders', InstanceType.Utility)

    this.startDarkAuctionReminder()
    this.startStarfallCultReminder()
    this.startSkyblockEventsNotifier()
  }

  private startDarkAuctionReminder(): void {
    let lastHourCheck = -1
    let lastMinuteCheck = -1

    setIntervalAsync(
      async () => {
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

          const message = this.application.core.languageConfigurations
            .getDarkAuctionReminder()
            .replaceAll('{minutes}', remainingMinutes.toString(10))

          await this.application.emit('broadcast', {
            ...this.eventHelper.fillBaseEvent(),

            channels: [ChannelType.Public],
            color: Color.Good,

            user: undefined,
            message: message
          })
        }
      },
      { errorHandler: this.errorHandler.promiseCatch('show dark auction reminder'), delay: Duration.seconds(5) }
    )
  }

  private startStarfallCultReminder(): void {
    let lastSkyblockDay = -1

    setIntervalAsync(
      async () => {
        if (!this.application.core.applicationConfigurations.getStarfallCultReminder()) return

        const date = SkyblockReminders.getSkyblockTime()
        const currentSkyblockDay = date.day

        if (lastSkyblockDay === currentSkyblockDay) return
        lastSkyblockDay = currentSkyblockDay

        if ([7, 14, 21, 28].includes(currentSkyblockDay)) {
          await this.application.emit('broadcast', {
            ...this.eventHelper.fillBaseEvent(),

            color: Color.Good,
            channels: [ChannelType.Public],

            user: undefined,
            message: this.application.core.languageConfigurations.getStarfallReminder()
          })
        }
      },
      { errorHandler: this.errorHandler.promiseCatch('show starfall reminder'), delay: Duration.seconds(5) }
    )
  }

  private startSkyblockEventsNotifier(): void {
    setIntervalAsync(
      async () => {
        const config = this.application.getSkyblockEventsConfig()
        if (!config?.enabled) return

        const now = Date.now()
        const events = getNextSkyblockEvents(now)

        for (const event of events) {
          if (!this.isSkyblockEventEnabled(event.key, config.notifiers)) continue
          if (
            event.key === 'FALLEN_STAR_CULT' &&
            this.application.core.applicationConfigurations.getStarfallCultReminder()
          ) {
            continue
          }

          const minutes = Math.floor((event.startTimestamp - now) / 1000 / 60)
          if (minutes < 0) continue
          if (!this.shouldNotifySkyblockEvent(event.key, minutes, config.customTimes)) continue

          const lastNotification = this.lastSkyblockEventNotifications.get(event.key)
          if (
            lastNotification &&
            lastNotification.startTimestamp === event.startTimestamp &&
            lastNotification.minutes === minutes
          ) {
            continue
          }

          await this.broadcastSkyblockEvent(event, minutes)
          this.lastSkyblockEventNotifications.set(event.key, { startTimestamp: event.startTimestamp, minutes })
          await sleep(1500)
        }
      },
      {
        errorHandler: this.errorHandler.promiseCatch('show skyblock event reminders'),
        delay: Duration.minutes(1)
      }
    )
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

  private isSkyblockEventEnabled(eventKey: SkyblockEventKey, notifiers?: Record<string, boolean>): boolean {
    if (!notifiers) return true
    return notifiers[eventKey]
  }

  private shouldNotifySkyblockEvent(
    eventKey: SkyblockEventKey,
    minutes: number,
    customTimes?: Record<string, string[]>
  ): boolean {
    if (minutes === 0) return true
    if (!customTimes) return false

    for (const [minutesKey, events] of Object.entries(customTimes)) {
      const parsedMinutes = Number.parseInt(minutesKey, 10)
      if (!Number.isFinite(parsedMinutes)) continue
      if (parsedMinutes !== minutes) continue
      if (events.includes(eventKey)) return true
    }

    return false
  }

  private async broadcastSkyblockEvent(event: SkyblockEventNext, minutes: number): Promise<void> {
    const message =
      minutes === 0 ? `[EVENT] ${event.name}: Starting now!` : `[EVENT] ${event.name}: Starting in ${minutes}m!`

    await this.application.emit('broadcast', {
      ...this.eventHelper.fillBaseEvent(),

      channels: [ChannelType.Public],
      color: Color.Good,

      user: undefined,
      message: message
    })
  }
}
