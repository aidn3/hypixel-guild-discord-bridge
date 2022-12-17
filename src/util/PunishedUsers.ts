export class PunishedUsers {
    private muted: { name: string, till: number }[] = []

    mutedTill(name: string): number | undefined {
        this.clean()

        let current = this.currentTime()
        return this.muted.find(p => p.name.toLowerCase() === name.toLowerCase() && p.till > current)?.till
    }

    mute(name: string, time: number): void {
        this.clean()
        this.unmute(name)

        let current = this.currentTime()
        this.muted.push({name: name, till: current + time})
    }

    unmute(name: string): void {
        this.muted = this.muted.filter(p => p.name.toLowerCase() !== name.toLowerCase())
    }

    private clean(): void {
        let current = this.currentTime()
        this.muted = this.muted.filter(p => p.till > current)
    }

    private currentTime(): number {
        return Math.floor(new Date().getTime() / 1000)
    }
}
