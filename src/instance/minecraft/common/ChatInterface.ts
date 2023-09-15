import MinecraftInstance from '../MinecraftInstance'
import { CommandsManager } from '../CommandsManager'

export interface MinecraftChatMessage {
  onChat: (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string) => void
}

export interface ChatCommandHandler {
  readonly triggers: string[]
  enabled: boolean

  handler: (context: ChatCommandContext) => Promise<string> | string
}

export interface ChatCommandContext {
  clientInstance: MinecraftInstance
  username: string
  args: string[]
}
