import type MinecraftInstance from '../minecraft-instance'
import type Application from '../../../application'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void
}

export interface MinecraftChatContext {
  application: Application
  clientInstance: MinecraftInstance
  instanceName: string
  message: string
}
