import type Application from '../../../application.js'
import type MinecraftInstance from '../minecraft-instance.js'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void | Promise<void>
}

export interface MinecraftChatContext {
  application: Application
  clientInstance: MinecraftInstance
  instanceName: string
  message: string
}
