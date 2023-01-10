import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandResponse} from "../../../common/ApplicationEvent"

export default class SendChatHandler extends EventHandler<MinecraftInstance> {

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.app.on("minecraftCommandResponse", event => this.onCommandResponse(event))
    }

    private async onCommandResponse(event: MinecraftCommandResponse) {
        await this.clientInstance.send(`/gc ${event.commandResponse}`)
    }
}
