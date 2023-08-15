export default class RateLimiter {
  private readonly maxCount
  private readonly interval

  private currentCount = 0
  private lastRequest = 0
  private lastReset = 0

  constructor (count: number, interval: number) {
    this.maxCount = count
    this.interval = interval
  }

  execute (func: ((value: any) => any) | null | undefined): void {
    void this.wait().then(func)
  }

  async wait (): Promise<void> {
    let currentTime
    while (true) {
      currentTime = new Date().getTime()

      if (currentTime > this.lastReset + this.interval) {
        this.lastReset = currentTime
        this.currentCount = 0
        break
      }

      if (this.currentCount < this.maxCount) {
        break
      }

      await new Promise(resolve => setTimeout(resolve, 10))
    }

    this.currentCount++
    this.lastRequest = currentTime
  }
}
