import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftSendChat} from "../../../common/ApplicationEvent"

export default class SendChatHandler extends EventHandler<MinecraftInstance> {

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.app.on("minecraftSend", event => this.onCommand(event))
    }

    private async onCommand(event: MinecraftSendChat) {
        if (event.targetInstanceName === null
            || event.targetInstanceName === this.clientInstance.instanceName) {

            await this.clientInstance.send(event.command)
        }
    }
}
