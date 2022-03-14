class EventHandler {
    clientInstance;

    constructor(clientInstance) {
        this.clientInstance = clientInstance
    }

    registerEvents() {
        throw new Error('method not implemented')
    }
}

module.exports = EventHandler
