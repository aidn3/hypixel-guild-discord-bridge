import type { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import type EventHelper from '../util/event-helper.js'

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

  eventHelper: EventHelper<InstanceType.Commands>
  logger: Logger
  errorHandler: UnexpectedErrorHandler

  allCommands: ChatCommandHandler[]
  commandPrefix: string
  adminUsername: string

  instanceName: string
  instanceType: InstanceType
  channelType: ChannelType

  username: string
  permission: Permission
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
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances
  permission: Permission
  handler: (context: DiscordCommandContext) => Promise<void>
  autoComplete?: (context: DiscordAutoCompleteContext) => Promise<void>
}

export enum OptionToAddMinecraftInstances {
  Disabled,
  Optional,
  Required
}

interface DiscordContext {
  application: Application
  eventHelper: EventHelper<InstanceType.Discord>
  logger: Logger
  instanceName: string

  privilege: Permission
  errorHandler: UnexpectedErrorHandler
}

export interface DiscordCommandContext extends DiscordContext {
  interaction: ChatInputCommandInteraction
  showPermissionDenied: () => Promise<void>
}

export interface DiscordAutoCompleteContext extends DiscordContext {
  interaction: AutocompleteInteraction
}
