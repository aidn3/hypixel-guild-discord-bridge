const {ClientInstance} = require("../../common/ClientInstance")
const MineFlayer = require('mineflayer')
const Status = require("../../common/Status")

const ErrorHandler = require("./handlers/ErrorHandler")
const StateHandler = require("./handlers/StateHandler")

const ChatManager = require("./ChatManager")
const {displayInstanceName: DISPLAY_INSTANCE_NAME} = require("../../../config/general-config.json")
const {bridge_prefix} = require("../../../config/minecraft-config.json")
const {SCOPE} = require("../../common/ClientInstance")
const commandsLimiter = new (require('../../util/RateLimiter'))(2, 1000)


function formatChatMessage(prefix, instance, username, replyUsername, message) {
    let full = `/${prefix} ${bridge_prefix}`

    if (DISPLAY_INSTANCE_NAME) full += `[${instance?.instanceName}] `

    full += username
    if (replyUsername) full += `⇾${replyUsername}`
    full += `: ${message}`

    return full
}

class MinecraftInstance extends ClientInstance {
    client;
    status;
    #connectionOptions;
    #handlers;

    constructor(app, instanceName, connectionOptions) {
        super(app, instanceName)

        this.#connectionOptions = connectionOptions
        this.client = null

        this.status = Status.FRESH
        this.#handlers = [
            new ErrorHandler(this),
            new StateHandler(this),

            new ChatManager(this),
        ]

        this.app.on("*.chat", async ({clientInstance, scope, username, replyUsername, message}) => {
            if (clientInstance === this) return

            if (scope === SCOPE.PUBLIC) {
                await this.send(formatChatMessage("gc", clientInstance, username, replyUsername, message))

            } else if (scope === SCOPE.OFFICER) {
                await this.send(formatChatMessage("oc", clientInstance, username, replyUsername, message))
            }
        })

        let send = this.send
        this.app.on("*.client.*", async function ({clientInstance, reason}) {
            if (clientInstance === this) return

            await send(`/gc @[${clientInstance?.instanceName || "Main"}]: ${reason ? reason : this.event}`)
        })

        this.app.on("*.event.*", async function ({clientInstance, scope, message, removeLater}) {
            if (clientInstance === this) return
            if (scope !== SCOPE.PUBLIC) return
            if (removeLater) return

            await send(`/gc @[${clientInstance?.instanceName || "Main"}]: ${message}`)
        })

    }

    connect() {
        if (this.client) this.client.quit()
        this.client = MineFlayer.createBot(this.#connectionOptions)
        this.app.emit("minecraft.client.create", {clientInstance: this})

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
            if (this?.client?.player) {
                this.client.chat(message)
            }
        })
    }
}

module.exports = MinecraftInstance