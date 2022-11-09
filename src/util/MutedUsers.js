class PunishedUsers {
    #muted = [];

    mutedTill(name) {
        this.#clean()

        let current = new Date().getTime() / 1000
        return this.#muted.find(p => p.name.toLowerCase() === name.toLowerCase() && p.till > current)?.till
    }

    mute(name, time) {
        this.#clean()
        this.unmute(name)

        let current = new Date().getTime() / 1000
        this.#muted.push({name: name, till: current + time})
    }

    unmute(name) {
        this.#muted = this.#muted.filter(p => p.name.toLowerCase() !== name.toLowerCase())
    }

    #clean() {
        let current = new Date().getTime() / 1000
        this.#muted = this.#muted.filter(p => p.till > current)
    }
}

module.exports = PunishedUsers