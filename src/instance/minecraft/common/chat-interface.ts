import type Application from '../../../application'
import type MinecraftInstance from '../minecraft-instance'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void | Promise<void>
}

export interface MinecraftChatContext {
  application: Application
  clientInstance: MinecraftInstance
  instanceName: string
  message: string
}
