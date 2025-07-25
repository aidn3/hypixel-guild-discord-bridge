import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../application.js'

import type { ChannelType, InstanceType, Permission } from './application-event.js'
import type EventHelper from './event-helper.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

export abstract class ChatCommandHandler {
  public readonly triggers: string[]
  public readonly description: string
  public readonly example: string

  protected constructor(options: { triggers: string[]; description: string; example: string }) {
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
  toggleCommand: (trigger: string) => 'enabled' | 'disabled' | 'not-found'

  instanceName: string
  instanceType: InstanceType
  channelType: ChannelType

  username: string
  permission: Permission
  args: string[]

  sendFeedback: (feedback: string) => void
}

export interface DiscordCommandHandler {
  readonly getCommandBuilder: () =>
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
  /**
   * @default OptionToAddMinecraftInstances.Disabled
   */
  readonly addMinecraftInstancesToOptions?: OptionToAddMinecraftInstances
  /**
   * @default CommandScope.Public
   */
  readonly scope?: CommandScope
  /**
   * @default Permission.Anyone
   */
  readonly permission?: Permission

  readonly handler: (context: Readonly<DiscordCommandContext>) => Promise<void>
  readonly autoComplete?: (context: Readonly<DiscordAutoCompleteContext>) => Promise<void>
}

export enum OptionToAddMinecraftInstances {
  Disabled,
  Optional,
  Required
}

export enum CommandScope {
  /**
   * only allow to execute in the registered chat channels
   */
  Chat,
  /**
   * only allow to execute in officer channels
   */
  Privileged,
  /**
   * Allow to execute in any channel anywhere without limitations
   */
  Anywhere
}

interface DiscordContext {
  application: Application
  eventHelper: EventHelper<InstanceType.Discord>
  logger: Logger
  instanceName: string

  permission: Permission
  errorHandler: UnexpectedErrorHandler

  allCommands: DiscordCommandHandler[]
}

export interface DiscordCommandContext extends DiscordContext {
  interaction: ChatInputCommandInteraction
  showPermissionDenied: () => Promise<void>
}

export interface DiscordAutoCompleteContext extends DiscordContext {
  interaction: AutocompleteInteraction
}
