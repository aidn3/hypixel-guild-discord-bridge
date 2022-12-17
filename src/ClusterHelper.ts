import Application from "./Application"
import {MinecraftSelfBroadcast, MinecraftSendChat} from "./common/ApplicationEvent"
import {LOCATION} from "./common/ClientInstance"

export default class ClusterHelper {
    private readonly app: Application
    private readonly minecraftBots = new Map<string, MinecraftSelfBroadcast>()
    private readonly instancesNames = new Map<LOCATION, Set<string>>()

    constructor(app: Application) {
        this.app = app

        this.app.on("minecraftSelfBroadcast", event => this.minecraftBots.set(event.instanceName, event))
        this.app.on("instance", event => this.instanceBroadcast(event.instanceName, event.location))
        this.app.on("selfBroadcast", event => this.instanceBroadcast(event.instanceName, event.location))
    }

    sendCommandToMinecraft(instanceName: string, command: string): void {
        this.app.emit("minecraftSend", <MinecraftSendChat>{
            targetInstanceName: instanceName,
            command: command
        })
    }

    sendCommandToAllMinecraft(command: string): void {
        this.app.emit("minecraftSend", <MinecraftSendChat>{
            targetInstanceName: undefined,
            command: command
        })
    }

    getMinecraftBotsUuid(): string[] {
        let uuids: string[] = []
        this.minecraftBots.forEach((v) => uuids.push(v.uuid))
        return uuids
    }

    getInstancesNames(location: LOCATION): string[] {
        let instanceNames = this.instancesNames.get(location)
        if (!instanceNames) return []

        let result: string[] = []
        for (let instanceName of instanceNames) {
            result.push(instanceName)
        }
        return result
    }

    isMinecraftBot(username: string): boolean {
        for (let value of this.minecraftBots.values()) {
            if (username === value.username) return true
        }

        return false
    }

    private instanceBroadcast(instanceName: string, location: LOCATION): void {
        let collection = this.instancesNames.get(location)
        if (!collection) {
            collection = new Set<string>()
            this.instancesNames.set(location, collection)
        }
        collection.add(instanceName)
    }

    /**
     * @deprecated
     */
    getHypixelApiKey(): string {
        return this.app.hypixelApi.key
    }
}