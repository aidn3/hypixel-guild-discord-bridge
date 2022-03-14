const EventHandler = require('../../common/EventHandler')

class StateHandler extends EventHandler {

    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client.on('error', (...args) => this.#onError(...args))
    }

    #onError(error) {
        this.clientInstance.logger.error('Minecraft Bot Error: ', error)
    }
}

module.exports = StateHandler
