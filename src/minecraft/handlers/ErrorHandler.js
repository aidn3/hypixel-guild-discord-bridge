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

        if (error?.code === 'EAI_AGAIN') {
            this.clientInstance.logger.error('Minecraft Bot disconnected duo to internet problems. restarting client in 30 second...')
            setTimeout(() => this.clientInstance.connect(), 30000)
        }
    }
}

module.exports = StateHandler
