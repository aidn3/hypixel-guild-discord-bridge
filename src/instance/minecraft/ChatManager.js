const fs = require('fs')
const EventHandler = require("../../common/EventHandler")

const chatEvents = fs.readdirSync('./src/minecraft/chat')
    .filter(file => file.endsWith('Chat.js'))
    .map(f => require(`./chat/${f}`))

class ChatManager extends EventHandler {
    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client.on('message', (...args) => this.#onMessage(...args))
    }

    #onMessage(event) {
        const message = event.toString().trim()

        // some chat events return promise.
        // some() is not viable
        chatEvents.forEach(e => e(this.clientInstance, message))
    }
}

module.exports = ChatManager