import MinecraftInstance from '../MinecraftInstance'
import { CommandsManager } from '../CommandsManager'
import Application from '../../../Application'

export interface MinecraftChatMessage {
  onChat: (context: MinecraftChatContext) => void
}

export interface MinecraftChatContext {
  application: Application
  clientInstance: MinecraftInstance
  instanceName: string
  commandsManager: CommandsManager
  message: string
}

export interface ChatCommandHandler {
  readonly name: string
  readonly triggers: string[]
  readonly description: string
  readonly example: string
  enabled: boolean

  handler: (context: ChatCommandContext) => Promise<string> | string
}

export interface ChatCommandContext {
  clientInstance: MinecraftInstance
  username: string
  args: string[]
}
