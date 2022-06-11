class PunishedUsers {
    #muted = [];

    muted(name) {
        let current = new Date().getTime()

        this.#muted = this.#muted.filter(p => p.till > current)
        return this.#muted.find(p => p.name.toLowerCase() === name.toLowerCase() && p.till > current)
    }

    mute(name, time) {
        let current = new Date().getTime()
        this.#muted.push({name: name, till: current + time})
    }

    unmute(name) {
        this.#muted = this.#muted.filter(p => p.name !== name)
    }
}

module.exports = PunishedUsers