import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from "../MinecraftInstance"
import {ChatMessage} from "prismarine-chat"
import {LOCATION} from "../../../common/ClientInstance"

export default class RawChatHandler extends EventHandler<MinecraftInstance> {

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client?.on('message', (message: ChatMessage) => this.onRawMessage(message.toString().trim()))
    }

    private onRawMessage(message: string) {
        this.clientInstance.app.emit("minecraftChat", {
            localEvent: true,
            instanceName: this.clientInstance.instanceName,
            location: LOCATION.MINECRAFT,
            message: message
        })
    }
}
