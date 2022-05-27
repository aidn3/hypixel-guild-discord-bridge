const EventHandler = require('../../common/EventHandler')
const Status = require("../../common/Status")
const COLOR = require('../../../config/discord-config.json').events.color

class StateHandler extends EventHandler {
    #loginAttempts;
    #exactDelay;

    constructor(clientInstance) {
        super(clientInstance)

        this.#loginAttempts = 0
        this.#exactDelay = 0
    }

    registerEvents() {
        this.clientInstance.client.on('login', (...args) => this.#onLogin(...args))
        this.clientInstance.client.on('end', (...args) => this.#onEnd(...args))
        this.clientInstance.client.on('kicked', (...args) => this.#onKicked(...args))
    }

    #onLogin() {
        this.clientInstance.logger.info('Minecraft client ready, logged in')

        this.#loginAttempts = 0
        this.#exactDelay = 0
        this.clientInstance.status = Status.CONNECTED

        this.clientInstance.bridge.onPublicEvent(
            this.clientInstance,
            null,
            `Client ${this.clientInstance.instanceName} is connected and ready!`,
            COLOR.GOOD,
            false
        )
    }

    #onEnd(reason) {
        if (this.clientInstance.status === Status.FAILED) {
            this.clientInstance.logger.warn(`Status is ${this.clientInstance.status}. no further retrying to reconnect.`)
            return

        } else if (reason === 'disconnect.quitting') {
            this.clientInstance.logger.debug(`Client quit on its own volition. no further retrying to reconnect.`)
            return
        }

        let loginDelay = this.#exactDelay
        if (loginDelay === 0) {
            loginDelay = (this.#loginAttempts + 1) * 5000

            if (loginDelay > 60000) {
                loginDelay = 60000
            }
        }

        this.clientInstance.logger.error(`Minecraft bot disconnected from server,`
            + `attempting reconnect in ${loginDelay / 1000} seconds`)

        this.clientInstance.bridge.onPublicEvent(
            this.clientInstance,
            null,
            `Client ${this.clientInstance.instanceName} is reconnecting in ${Math.floor(loginDelay / 1000)} second.`,
            COLOR.INFO,
            false
        )

        setTimeout(() => this.clientInstance.connect(), loginDelay)
        this.clientInstance.status = Status.RECONNECTING
    }

    #onKicked(reason) {
        this.clientInstance.logger.error(reason)
        this.clientInstance.logger.error(`Minecraft bot was kicked from server for "${reason}"`)

        this.#loginAttempts++
        if (reason.includes("You logged in from another location")) {
            this.clientInstance.logger.fatal("Instance will shut off since someone logged in from another place")
            this.clientInstance.status = Status.FAILED
            this.clientInstance.bridge.onPublicEvent(
                this.clientInstance,
                this.clientInstance.username(),
                "Someone logged in from another place.\nWon't try to re-login.\nRestart to reconnect.",
                COLOR.ERROR,
                false
            )

        } else {
            this.clientInstance.bridge.onPublicEvent(
                this.clientInstance,
                null,
                `Client ${this.clientInstance.instanceName} has been kicked.\n`
                + `Attempting to reconnect will be made soon\n`
                + `Current reconnecting attempts: ${this.#loginAttempts}`,
                COLOR.ERROR,
                false
            )
        }
    }
}

module.exports = StateHandler
