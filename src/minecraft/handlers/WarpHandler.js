const EventHandler = require('../../common/EventHandler')

class WarpHandler extends EventHandler {

    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client.on('spawn', () => this.#onSpawn())
        this.clientInstance.client.on('respawn', () => this.#onSpawn())
    }

    #onSpawn() {
        this.clientInstance.logger.debug(`Spawn event triggered. sending to limbo...`)
        this.clientInstance.send("§")
    }
}

module.exports = WarpHandler
