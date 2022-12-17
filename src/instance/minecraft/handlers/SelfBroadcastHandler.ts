import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftSelfBroadcast} from "../../../common/ApplicationEvent"
import {LOCATION} from "../../../common/ClientInstance"

export default class SelfBroadcastHandler extends EventHandler<MinecraftInstance> {

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client?.on("spawn", () => this.onSpawn())
    }

    private onSpawn() {
        let username = this.clientInstance.username()
        let uuid = this.clientInstance.uuid()

        if (username && uuid) {
            this.clientInstance.app.emit("minecraftSelfBroadcast", <MinecraftSelfBroadcast>{
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                uuid: uuid,
                username: username
            })
        }
    }
}
