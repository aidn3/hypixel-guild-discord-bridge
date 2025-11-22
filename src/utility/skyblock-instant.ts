// Although it only contains static methods right now, it will be extended in the future with more properties
/* eslint-disable @typescript-eslint/no-extraneous-class */

import assert from 'node:assert'

export class SkyblockInstant {
  public static readonly HoursCount = 24
  private static readonly HourInMillisecond = 50_000

  public static readonly MinutesCount = 60
  private static readonly MinutesInMilliseconds = this.HourInMillisecond / this.MinutesCount

  public static readonly SecondsCount = 60
  private static readonly SecondsInMilliseconds = this.MinutesInMilliseconds / this.SecondsCount

  public static readonly DaysCount = 31
  private static readonly DayInMilliseconds = this.HoursCount * this.HourInMillisecond

  public static readonly MonthsCount = 12
  private static readonly MonthInMillisecond = this.DaysCount * this.DayInMilliseconds

  public static readonly YearInMillisecond = this.MonthsCount * this.MonthInMillisecond
  private static readonly Year0 = 1_560_275_700_000

  public static toSkyblockInstant(timestamp: number): SkyblockInstant {
    this.assertValidSkyblockTimestamp(timestamp)

    const currentEpoch = timestamp - this.Year0
    const second = (currentEpoch % this.MinutesInMilliseconds) / this.SecondsInMilliseconds
    const minute = (currentEpoch % this.HourInMillisecond) / this.MinutesInMilliseconds
    const hour = (currentEpoch % this.DayInMilliseconds) / this.HourInMillisecond
    const day = (currentEpoch % this.MonthInMillisecond) / this.DayInMilliseconds + 1
    const month = (currentEpoch % this.YearInMillisecond) / this.MonthInMillisecond + 1
    const year = currentEpoch / this.YearInMillisecond + 1

    return {
      year: Math.floor(year),
      month: Math.floor(month),
      day: Math.floor(day),
      hour: Math.floor(hour),
      minute: Math.floor(minute),
      second: Math.floor(second)
    }
  }

  public static toTimestamp(instant: InstantOptions): number {
    this.assertValidSkyblockWithYear(instant)

    let timestamp = this.Year0

    timestamp += (instant.year - 1) * this.YearInMillisecond
    timestamp += (instant.month - 1) * this.MonthInMillisecond
    timestamp += (instant.day - 1) * this.DayInMilliseconds
    timestamp += instant.hour * this.HourInMillisecond
    timestamp += instant.minute * this.MinutesInMilliseconds
    timestamp += instant.second * this.SecondsInMilliseconds

    return Math.floor(timestamp)
  }

  private static assertValidSkyblockTimestamp(timestamp: number): asserts timestamp is number {
    assert.ok(
      timestamp >= this.YearInMillisecond,
      `timestamp must be at least year 0 in Skyblock time. Given is ${timestamp}`
    )
  }

  private static assertNoSkyblockYear<T extends Partial<Omit<SkyblockInstant, 'year'>>>(
    instant: T
  ): asserts instant is T {
    assert.strictEqual(
      'year' in instant ? instant.year : undefined,
      undefined,
      'Do not set a specific year in options to find the next possible year on its own'
    )
  }

  private static assertValidSkyblockWithYear(instant: InstantOptions): asserts instant is InstantOptions {
    this.assertValidYear(instant.year)
    this.assertValidSkyblockWithoutYear(instant)
  }

  private static assertValidSkyblockWithoutYear(
    instant: Omit<InstantOptions, 'year'>
  ): asserts instant is InstantOptions {
    this.assertValidMonth(instant.month)
    this.assertValidDay(instant.day)
    this.assertValidHour(instant.hour)
  }

  private static assertValidYear(integer: number): void {
    assert.ok(integer >= 0, `year must be a positive integer. Given ${integer}`)
    assert.ok(integer === Math.floor(integer), `year must be a whole number. Given ${integer}.`)
  }

  private static assertValidMonth(integer: number): void {
    assert.ok(
      integer >= 1 && integer <= this.MonthsCount,
      `month must be between 1 and ${this.MonthsCount}. Given ${integer}`
    )
    assert.ok(integer === Math.floor(integer), `month must be a whole number. Given ${integer}.`)
  }

  private static assertValidDay(integer: number): void {
    assert.ok(
      integer >= 1 && integer <= this.DaysCount,
      `day must be between 1 and ${this.DaysCount}. Given ${integer}`
    )
    assert.ok(integer === Math.floor(integer), `day must be a whole number. Given ${integer}.`)
  }

  private static assertValidHour(integer: number): void {
    assert.ok(
      integer >= 0 && integer <= this.HoursCount - 1,
      `hour must be between 0 and ${this.HoursCount - 1}. Given ${integer}`
    )
    assert.ok(integer === Math.floor(integer), `hour must be a whole number. Given ${integer}.`)
  }
}

export interface InstantOptions {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export class SkyblockEvents {
  private static readonly ElectionEnds = { month: 1, day: 27, minute: 0, hour: 0, second: 0 }

  private static readonly DerpyMayorBaseTime = SkyblockInstant.toTimestamp({ ...this.ElectionEnds, year: 440 })
  private static readonly JerryMayorBaseTime = SkyblockInstant.toTimestamp({ ...this.ElectionEnds, year: 448 })
  private static readonly ScorpiusMayorBaseTime = SkyblockInstant.toTimestamp({ ...this.ElectionEnds, year: 456 })

  public static getSpecialMayors(currentTime: number): {
    derpy: EventAppointment
    jerry: EventAppointment
    scorpius: EventAppointment
  } {
    return {
      derpy: this.getSpecialMayorAppointment(currentTime, this.DerpyMayorBaseTime),
      jerry: this.getSpecialMayorAppointment(currentTime, this.JerryMayorBaseTime),
      scorpius: this.getSpecialMayorAppointment(currentTime, this.ScorpiusMayorBaseTime)
    }
  }

  private static getSpecialMayorAppointment(currentTime: number, baseTime: number): EventAppointment {
    const TimeTillSameSpecialMayor = SkyblockInstant.YearInMillisecond * 24

    while (baseTime < currentTime) {
      if (baseTime + SkyblockInstant.YearInMillisecond > currentTime) {
        return { type: 'happening', time: baseTime + SkyblockInstant.YearInMillisecond }
      }

      baseTime += TimeTillSameSpecialMayor
    }

    return { type: 'future', time: baseTime }
  }
}

export interface EventAppointment {
  type: 'future' | 'happening'
  /**
   * time till the event starts if {@link #type} is "future".
   * time till the event ends if {@link #type} is "happening".
   */
  time: number
}
