import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../application.js'

import type { ChannelType, InstanceType } from './application-event.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

export abstract class ChatCommandHandler {
  public readonly name: string
  public readonly triggers: string[]
  public readonly description: string
  public readonly example: string
  public enabled = true

  protected constructor(options: { name: string; triggers: string[]; description: string; example: string }) {
    this.name = options.name
    this.triggers = options.triggers
    this.description = options.description
    this.example = options.example
  }

  public getExample(commandPrefix: string): string {
    return `Example: ${commandPrefix}${this.example}`
  }

  public abstract handler(context: ChatCommandContext): Promise<string> | string
}

export interface ChatCommandContext {
  app: Application

  logger: Logger
  errorHandler: UnexpectedErrorHandler

  allCommands: ChatCommandHandler[]
  commandPrefix: string
  adminUsername: string

  instanceName: string
  instanceType: InstanceType
  channelType: ChannelType

  username: string
  // TODO: use Permission from discord instead
  isAdmin: boolean
  args: string[]

  sendFeedback: (feedback: string) => void
}

// values must be numbers to be comparable
export enum Permission {
  Anyone,
  Helper,
  Officer,
  Admin
}

export interface DiscordCommandHandler {
  getCommandBuilder: () => SlashCommandBuilder
  // TODO: use enum with "Disabled", "Optional", "Required". Name can be "addMinecraftInstancesToOption"
  // Maybe rename it "options" and enum like "OptionalMinecraftInstances" | etc
  allowInstance: boolean
  permission: Permission
  handler: (context: DiscordCommandContext) => Promise<void>
}

export interface DiscordCommandContext {
  application: Application
  logger: Logger
  instanceName: string
  interaction: ChatInputCommandInteraction
  privilege: Permission
  showPermissionDenied: () => Promise<void>
  errorHandler: UnexpectedErrorHandler
}
