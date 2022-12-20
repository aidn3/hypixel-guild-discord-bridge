import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from "../MinecraftInstance"
import {InstanceEventType} from "../../../common/ApplicationEvent"
import {LOCATION, Status} from "../../../common/ClientInstance"

export default class StateHandler extends EventHandler<MinecraftInstance> {
    private loginAttempts
    private exactDelay

    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)

        this.loginAttempts = 0
        this.exactDelay = 0
    }

    registerEvents() {
        this.clientInstance.client?.on('login', () => this.onLogin())
        this.clientInstance.client?.on('end', (reason: string) => this.onEnd(reason))
        this.clientInstance.client?.on('kicked', (reason: string) => this.onKicked(reason))
    }

    private onLogin() {
        this.clientInstance.logger.info('Minecraft client ready, logged in')

        this.loginAttempts = 0
        this.exactDelay = 0
        this.clientInstance.status = Status.CONNECTED

        this.clientInstance.app.emit("instance", {
            localEvent: true,
            instanceName: this.clientInstance.instanceName,
            location: LOCATION.MINECRAFT,
            type: InstanceEventType.connect,
            message: "Minecraft instance has connected"
        })
    }

    private onEnd(reason: string) {
        if (this.clientInstance.status === Status.FAILED) {
            let reason = `Status is ${this.clientInstance.status}. no further retrying to reconnect.`

            this.clientInstance.logger.warn(reason)
            this.clientInstance.app.emit("instance", {
                localEvent: true,
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                type: InstanceEventType.end,
                message: reason
            })
            return

        } else if (reason === 'disconnect.quitting') {
            let reason = `Client quit on its own volition. no further retrying to reconnect.`

            this.clientInstance.logger.debug(reason)
            this.clientInstance.app.emit("instance", {
                localEvent: true,
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                type: InstanceEventType.end,
                message: reason
            })
            return
        }

        let loginDelay = this.exactDelay
        if (loginDelay === 0) {
            loginDelay = (this.loginAttempts + 1) * 5000

            if (loginDelay > 60000) {
                loginDelay = 60000
            }
        }

        this.clientInstance.logger.error(`Minecraft bot disconnected from server,`
            + `attempting reconnect in ${loginDelay / 1000} seconds`)

        this.clientInstance.app.emit("instance", {
            localEvent: true,
            instanceName: this.clientInstance.instanceName,
            location: LOCATION.MINECRAFT,
            type: InstanceEventType.disconnect,
            message: `Minecraft bot disconnected from server,`
                + `attempting reconnect in ${loginDelay / 1000} seconds`
        })

        setTimeout(() => this.clientInstance.connect(), loginDelay)
        this.clientInstance.status = Status.CONNECTING
    }

    private onKicked(reason: string) {
        this.clientInstance.logger.error(reason)
        this.clientInstance.logger.error(`Minecraft bot was kicked from server for "${reason.toString()}"`)

        this.loginAttempts++
        if (reason.includes("You logged in from another location")) {
            this.clientInstance.logger.fatal("Instance will shut off since someone logged in from another place")
            this.clientInstance.status = Status.FAILED

            this.clientInstance.app.emit("instance", {
                localEvent: true,
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                type: InstanceEventType.conflict,
                message: "Someone logged in from another place.\n"
                    + "Won't try to re-login.\n"
                    + "Restart to reconnect."
            })

        } else {
            this.clientInstance.app.emit("instance", {
                localEvent: true,
                instanceName: this.clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                type: InstanceEventType.kick,
                message: `Client ${this.clientInstance.instanceName} has been kicked.\n`
                    + `Attempting to reconnect will be made soon\n\n`
                    + reason.toString()
            })
        }
    }
}
