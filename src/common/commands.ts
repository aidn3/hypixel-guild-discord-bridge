/* eslint-disable @typescript-eslint/naming-convention */
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import type { TFunction } from 'i18next'
import type { Logger } from 'log4js'

import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import type Duration from '../utility/duration'

import type { ChannelType, ChatEvent, Content, InstanceType, Permission } from './application-event.js'
import type EventHelper from './event-helper.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'
import type { AnonymousUser, DiscordUser } from './user'

export interface ChatCommandRequirements {
  permission?: Permission
  sources?: ChannelType[]
  platforms?: (InstanceType.Minecraft | InstanceType.Discord)[]
}

export type ChatCommandCooldown =
  | {
      type: CooldownType.User | CooldownType.Channel | CooldownType.Community | CooldownType.Global
      duration: Duration
    }
  | { type: CooldownType.Disabled }

export enum CooldownType {
  /**
   * Cooldown is completely disabled
   */
  Disabled = 'none',
  /**
   * Every user has their own cooldown independent of other users
   */
  User = 'user',
  /**
   * Every channel {@link ChannelType} has its own cooldown.
   * so the command can not be executed multiple times in a row by different users on the same channel
   */
  Channel = 'channel',
  /**
   * Every community (all its channels combined) share a single cooldown.
   * Private usage has no cooldown.
   */
  Community = 'bridge',
  /**
   * The command has a cooldown that is shared by everyone.
   */
  Global = 'global'
}

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public enabled(application: Application): boolean {
    return true
  }

  public cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Disabled }
  }

  /**
   * Check pre-conditions before executing a command in {@link ChatCommandHandler#handler} of the command.
   * @param context the chat command context that will be used
   *   on the {@link ChatCommandHandler#handler} if the requirements are met
   * @returns an `object` containing the requirements to automatically check
   *   OR `string` that contains a rejection message specifically for this command execution.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public requirements(context: ChatCommandContext): ChatCommandRequirements | string {
    return {}
  }

  public abstract handler(context: ChatCommandContext): Promise<Content | string> | Content | string
}

export interface ChatCommandContext {
  app: Application

  t: TFunction
  eventHelper: EventHelper<InstanceType.Commands>
  logger: Logger
  errorHandler: UnexpectedErrorHandler

  allCommands: ChatCommandHandler[]
  commandPrefix: string

  message: ChatEvent
  username: string
  args: string[]

  sendFeedback: (feedback: Content | string) => Promise<void>
  resetCooldown: () => void
}

export type DiscordCommandHandler =
  | DiscordPrivateCommandHandler
  | DiscordGuildCommandHandler
  | DiscordBridgeCommandHandler<OptionMinecraftInstance>

interface BaseDiscordCommandHandler {
  readonly getCommandBuilder: () =>
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
}

export interface DiscordPrivateCommandHandler extends BaseDiscordCommandHandler {
  readonly origin: CommandOrigin.Private
  readonly permission: Permission.Anyone | Permission.ApplicationAdmin
  readonly handler: (context: Readonly<DiscordCommandContext<CommandOrigin.Private, void>>) => Promise<void>
  readonly autoComplete?: (context: Readonly<DiscordAutoCompleteContext<CommandOrigin.Private>>) => Promise<void>
}

export interface DiscordGuildCommandHandler extends BaseDiscordCommandHandler {
  readonly origin: CommandOrigin.Guild
  /**
   * Only Discord server admin where the command is being executed
   */
  readonly onlyAdmins: boolean
  readonly handler: (context: Readonly<DiscordCommandContext<CommandOrigin.Guild, void>>) => Promise<void>
  readonly autoComplete?: (context: Readonly<DiscordAutoCompleteContext<CommandOrigin.Guild>>) => Promise<void>
}

export interface DiscordBridgeCommandHandler<
  MinecraftOption extends OptionMinecraftInstance
> extends BaseDiscordCommandHandler {
  readonly origin: CommandOrigin.Bridge
  readonly addMinecraftInstancesToOptions: MinecraftOption
  readonly permission: Permission.Anyone | Permission.Helper | Permission.Officer | Permission.BridgeAdmin
  readonly handler: (context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, MinecraftOption>>) => Promise<void>
  readonly autoComplete?: (context: Readonly<DiscordAutoCompleteContext<CommandOrigin.Bridge>>) => Promise<void>
}

export enum OptionMinecraftInstance {
  None = 'none',
  RequireOne = 'requireOne',
  RequireAll = 'requireAll'
}

interface BaseDiscordContext<Origin extends CommandOrigin> {
  application: Application
  eventHelper: EventHelper<InstanceType.Discord>
  logger: Logger
  t: TFunction

  permission: Permission
  //bridgeId: Origin extends CommandOrigin.Bridge ? BridgeId : BridgeId | undefined
  user: OriginDecider<Origin, AnonymousUser, AnonymousUser, DiscordUser>
  errorHandler: UnexpectedErrorHandler

  allCommands: DiscordCommandHandler[]
}

export enum CommandOrigin {
  Private = 'private',
  Guild = 'guild',
  Bridge = 'bridge'
}
type OriginDecider<
  Origin extends CommandOrigin,
  PrivateType,
  GuildType,
  BridgeType
> = Origin extends CommandOrigin.Private
  ? PrivateType
  : Origin extends CommandOrigin.Guild
    ? GuildType
    : Origin extends CommandOrigin.Bridge
      ? BridgeType
      : never

export interface DiscordCommandContext<
  Origin extends CommandOrigin,
  MinecraftOption = Origin extends CommandOrigin.Bridge ? OptionMinecraftInstance : undefined
> extends BaseDiscordContext<Origin> {
  interaction: OriginDecider<
    Origin,
    ChatInputCommandInteraction,
    ChatInputCommandInteraction<'raw' | 'cached'>,
    MinecraftOption extends OptionMinecraftInstance.RequireOne
      ?
          | ChatInputCommandInteraction<'raw' | 'cached'>
          | (ModalSubmitInteraction<'raw' | 'cached'> & { options: ChatInputCommandInteraction['options'] })
      : ChatInputCommandInteraction<'raw' | 'cached'>
  >
  minecraftInstance: [MinecraftOption] extends [OptionMinecraftInstance.RequireOne]
    ? string
    : [MinecraftOption] extends [OptionMinecraftInstance.RequireAll]
      ? string[]
      : undefined
  showPermissionDenied: (requiredPermission: Exclude<Permission, Permission.Anyone>) => Promise<void>
}

export interface DiscordAutoCompleteContext<Origin extends CommandOrigin> extends BaseDiscordContext<Origin> {
  interaction: OriginDecider<
    Origin,
    AutocompleteInteraction,
    AutocompleteInteraction<'raw' | 'cached'>,
    AutocompleteInteraction<'raw' | 'cached'>
  >
}
