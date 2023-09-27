export class PunishedUsers {
  private muted: { name: string; till: number }[] = []

  mutedTill(name: string): number | undefined {
    this.clean()

    const current = this.currentTime()
    return this.muted.find((p) => p.name.toLowerCase() === name.toLowerCase() && p.till > current)?.till
  }

  mute(name: string, time: number): void {
    this.clean()
    this.unmute(name)

    const current = this.currentTime()
    this.muted.push({ name, till: current + time })
  }

  unmute(name: string): void {
    this.muted = this.muted.filter((p) => p.name.toLowerCase() !== name.toLowerCase())
  }

  private clean(): void {
    const current = this.currentTime()
    this.muted = this.muted.filter((p) => p.till > current)
  }

  private currentTime(): number {
    return Math.floor(Date.now() / 1000)
  }
}
