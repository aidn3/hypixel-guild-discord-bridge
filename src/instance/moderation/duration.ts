export class Duration {
  private readonly durationInMilliseconds: number

  private constructor(durationInMilliseconds: number) {
    this.durationInMilliseconds = durationInMilliseconds
  }

  /*
    public static parse(query: string): Duration {}

    public static from(milliseconds: number): Duration {}

    public toHypixel(): string {}
  */

  public inSeconds(): number {
    return Math.floor(this.durationInMilliseconds / 1000)
  }
}
