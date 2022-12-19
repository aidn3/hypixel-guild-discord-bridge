import MinecraftInstance from "../MinecraftInstance"
import {CommandsManager} from "../CommandsManager"

export interface MinecraftChatMessage {
    onChat(clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void
}

export interface MinecraftCommandMessage {
    readonly triggers: string[]
    enabled: boolean

    handler(clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string>
}