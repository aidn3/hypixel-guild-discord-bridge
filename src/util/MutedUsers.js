class PunishedUsers {
    #muted = [];

    mutedTill(name) {
        this.#clean()

        let current = this.#currentTime()
        return this.#muted.find(p => p.name.toLowerCase() === name.toLowerCase() && p.till > current)?.till
    }

    mute(name, time) {
        this.#clean()
        this.unmute(name)

        let current = this.#currentTime()
        this.#muted.push({name: name, till: current + time})
    }

    unmute(name) {
        this.#muted = this.#muted.filter(p => p.name.toLowerCase() !== name.toLowerCase())
    }

    #clean() {
        let current = this.#currentTime()
        this.#muted = this.#muted.filter(p => p.till > current)
    }

    #currentTime() {
        return Math.floor(new Date().getTime() / 1000)
    }
}

module.exports = PunishedUsers