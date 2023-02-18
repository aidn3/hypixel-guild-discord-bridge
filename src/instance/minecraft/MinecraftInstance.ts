import MineFlayer = require('mineflayer');
import ChatManager from "./ChatManager"
import Application from "../../Application"
import {ClientInstance, LOCATION, Status} from "../../common/ClientInstance"
import {ChatEvent, ClientEvent, InstanceEventType, MinecraftCommandResponse} from "../../common/ApplicationEvent"
import RawChatHandler from "./handlers/RawChatHandler";
import SelfBroadcastHandler from "./handlers/SelfBroadcastHandler";
import SendChatHandler from "./handlers/SendChatHandler";
import ErrorHandler from "./handlers/ErrorHandler";
import StateHandler from "./handlers/StateHandler";
import MinecraftConfig from "./common/MinecraftConfig";
import {EventType} from "../../common/ApplicationEvent";


const {SCOPE} = require("../../common/ClientInstance")
const commandsLimiter = new (require('../../util/RateLimiter').default)(1, 1000)


export default class MinecraftInstance extends ClientInstance<MinecraftConfig> {
    private readonly handlers
    client: MineFlayer.Bot | undefined

    constructor(app: Application, instanceName: string, config: MinecraftConfig) {
        super(app, instanceName, LOCATION.MINECRAFT, config)


        this.status = Status.FRESH
        this.handlers = [
            new ErrorHandler(this),
            new StateHandler(this),
            new RawChatHandler(this),
            new SelfBroadcastHandler(this),
            new SendChatHandler(this),

            new ChatManager(this),
        ]

        this.app.on("minecraftCommandResponse", async (event: MinecraftCommandResponse) => {
            if (event.instanceName !== this.instanceName) {
                await this.send(this.formatChatMessage("gc", event.username, undefined, event.fullCommand))
            }

            return this.send(`/gc ${event.commandResponse}`)
        })

        this.app.on("chat", (event: ChatEvent) => {
            if (event.instanceName === this.instanceName) return

            if (event.scope === SCOPE.PUBLIC) {
                return this.send(this.formatChatMessage("gc", event.username, event.replyUsername, event.message))

            } else if (event.scope === SCOPE.OFFICER) {
                return this.send(this.formatChatMessage("oc", event.username, event.replyUsername, event.message))
            }
        })

        this.app.on("event", (event: ClientEvent) => {
            if (event.instanceName === this.instanceName) return
            if (event.scope !== SCOPE.PUBLIC) return
            if (event.removeLater) return
            if (event.name === EventType.COMMAND) return

            return this.send(`/gc @[${event.instanceName || "Main"}]: ${event.message}`)
        })
    }

    async connect() {
        if (this.client) this.client.quit()

        this.client = MineFlayer.createBot(this.config.botOptions)
        this.app.emit("instance", {
            localEvent: true,
            instanceName: this.instanceName,
            location: LOCATION.MINECRAFT,
            type: InstanceEventType.create,
            message: "Minecraft instance has been created"
        })

        this.handlers.forEach(handler => handler.registerEvents())
    }

    username(): string | undefined {
        return this.client?.player?.username
    }

    uuid(): string | undefined {
        let uuid = this.client?.player?.uuid
        if (uuid) return uuid.split("-").join("")
        return uuid
    }

    async send(message: string): Promise<void> {
        return commandsLimiter.wait().then(() => {
            if (this?.client?.player) {
                this.client.chat(message)
            }
        })
    }

    private formatChatMessage(prefix: string, username: string, replyUsername: string | undefined, message: string) {
        let full = `/${prefix} ${this.config.bridgePrefix}`

        if (this.app.config.general.displayInstanceName) full += `[${this.instanceName}] `

        full += username
        if (replyUsername) full += `⇾${replyUsername}`
        full += `: ${message}`

        return full
    }
}
