import MinecraftInstance from "../instance/minecraft/MinecraftInstance"

async function limbo(clientInstance: MinecraftInstance) {
    clientInstance.logger.debug(`Spawn event triggered. sending to limbo...`)
    await clientInstance.send("§")
}

/*
 * Stuck minecraft client in limbo and prevent it from ever leaving
 */
import Application from "../Application"
import {InstanceEventType} from "../common/ApplicationEvent"
import PluginInterface from "../common/PluginInterface"
import {ClientInstance, LOCATION} from "../common/ClientInstance"

export default <PluginInterface>{
    onRun(app: Application, getLocalInstance: (instanceName: string) => ClientInstance | undefined): any {
        app.on("instance", (event) => {
            if (event.type === InstanceEventType.create && event.location === LOCATION.MINECRAFT) {

                let localInstance = getLocalInstance(event.instanceName)
                if (localInstance) {
                    let clientInstance = <MinecraftInstance>localInstance
                    clientInstance.client?.on("spawn", () => limbo(clientInstance))
                    clientInstance.client?.on("respawn", () => limbo(clientInstance))
                }
            }
        })
    }
}