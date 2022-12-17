import MinecraftInstance from "../MinecraftInstance"

export interface MinecraftChatMessage {
    onChat(clientInstance: MinecraftInstance, message: string): void
}

export interface MinecraftCommandMessage {
    readonly triggers: string[]
    enabled: boolean

    handler(clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string>
}