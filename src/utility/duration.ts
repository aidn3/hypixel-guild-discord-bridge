export default class Duration {
  private static readonly MillisecondsValue = 1000
  private static readonly SecondsValue = 60
  private static readonly MinutesValue = 60
  private static readonly HoursValue = 24
  private static readonly DaysValue = 30
  private static readonly MonthsValue = 12

  private constructor(private readonly milliseconds: number) {}

  public static milliseconds(milliseconds: number): Duration {
    return new Duration(milliseconds)
  }

  public static seconds(second: number): Duration {
    return this.milliseconds(second * this.MillisecondsValue)
  }

  public static minutes(minute: number): Duration {
    return this.seconds(minute * this.SecondsValue)
  }

  public static hours(hours: number): Duration {
    return this.minutes(hours * this.MinutesValue)
  }

  public static days(day: number): Duration {
    return this.hours(day * this.HoursValue)
  }

  public static months(month: number): Duration {
    return this.days(month * this.DaysValue)
  }

  public static years(year: number): Duration {
    return this.months(year * this.MonthsValue)
  }

  public toMilliseconds(): number {
    return this.milliseconds
  }

  public toSeconds(): number {
    return this.milliseconds / Duration.MillisecondsValue
  }

  public toMinutes(): number {
    return this.toSeconds() / Duration.SecondsValue
  }

  public toHours(): number {
    return this.toMinutes() / Duration.MinutesValue
  }

  public toDays(): number {
    return this.toHours() / Duration.HoursValue
  }
}
