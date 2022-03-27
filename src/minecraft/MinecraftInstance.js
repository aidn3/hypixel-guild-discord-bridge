const ClientInstance = require("../common/ClientInstance")
const MineFlayer = require('mineflayer')
const Status = require("../common/Status")

const ErrorHandler = require("./handlers/ErrorHandler")
const StateHandler = require("./handlers/StateHandler")
const WarpHandler = require("./handlers/WarpHandler")

const ChatManager = require("./ChatManager")
const PartyManager = require("./PartyManager")

const commandsLimiter = new (require('../util/RateLimiter'))(2, 1000)

class MinecraftInstance extends ClientInstance {
    client;
    status;
    #connectionOptions;
    #handlers;

    constructor(instanceName, bridge, connectionOptions, hypixelGuild) {
        super(instanceName, bridge)

        this.#connectionOptions = connectionOptions
        this.client = null

        this.status = Status.FRESH
        this.#handlers = [
            new ErrorHandler(this),
            new StateHandler(this),
            new WarpHandler(this),

            new ChatManager(this),
            new PartyManager(this, hypixelGuild),
        ]
    }

    connect() {
        if (this.client) this.client.quit()
        this.client = MineFlayer.createBot(this.#connectionOptions)
        this.#handlers.forEach(handler => handler.registerEvents())
    }

    username() {
        return this.client?.player?.username
    }

    uuid() {
        let uuid = this.client?.player?.uuid
        if (uuid) return uuid.split("-").join("")
        return uuid
    }

    async send(message) {
        return commandsLimiter.wait().then(() => {
            if (this.client.player !== undefined) {
                this.client.chat(message)
            }
        })
    }
}

module.exports = MinecraftInstance