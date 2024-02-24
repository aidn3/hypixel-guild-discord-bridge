import type MinecraftInstance from '../MinecraftInstance'
import type Application from '../../../Application'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void
}

export interface MinecraftChatContext {
  application: Application
  clientInstance: MinecraftInstance
  instanceName: string
  message: string
}
