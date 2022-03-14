const EventHandler = require('../../common/EventHandler')
const log4js = require("log4js")

class StateHandler extends EventHandler {

    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client.on('ready', () => this.#onReady())
    }

    #onReady() {
        this.clientInstance.logger.info('Discord client ready, logged in as '
            + this.clientInstance.client.user.tag)
    }
}

module.exports = StateHandler
