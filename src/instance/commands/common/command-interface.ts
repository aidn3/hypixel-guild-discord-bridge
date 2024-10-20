import type * as Logger4js from 'log4js'

import type Application from '../../../application.js'
import type { ChannelType, InstanceType } from '../../../common/application-event.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'

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

  logger: Logger4js.Logger
  errorHandler: UnexpectedErrorHandler

  allCommands: ChatCommandHandler[]
  commandPrefix: string
  adminUsername: string

  instanceName: string
  instanceType: InstanceType
  channelType: ChannelType

  username: string
  isAdmin: boolean
  args: string[]

  sendFeedback: (feedback: string) => void
}
