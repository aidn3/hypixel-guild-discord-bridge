import Application from '../../../Application'
import { ChannelType, InstanceType } from '../../../common/ApplicationEvent'

export abstract class ChatCommandHandler {
  readonly name: string
  readonly triggers: string[]
  readonly description: string
  readonly example: string
  enabled = true

  protected constructor(options: { name: string; triggers: string[]; description: string; example: string }) {
    this.name = options.name
    this.triggers = options.triggers
    this.description = options.description
    this.example = options.example
  }

  abstract handler(context: ChatCommandContext): Promise<string> | string

  getExample(commandPrefix: string): string {
    return `Example: ${commandPrefix}${this.example}`
  }
}

export interface ChatCommandContext {
  app: Application

  allCommands: ChatCommandHandler[]
  commandPrefix: string
  adminUsername: string

  instanceName: string
  instanceType: InstanceType
  channelType: ChannelType
  username: string
  args: string[]
}
