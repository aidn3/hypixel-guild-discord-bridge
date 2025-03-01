import type { Status } from './client-instance.js'
/*
 All events must be immutable.
 Events can be transferred over IPC or websockets. Immutability can ensure defined and repeatable behaviour.
 All events are set with Readonly<?>

 All communication with other instances must be done via events.
 This is to ensure full synchronization with other processes over IPC/websockets.
 */

/**
 * All available High Level events
 */
export interface ApplicationEvents {
  /**
   * Receive all events
   * @param name event name
   * @param event event object
   */
  all: (name: string, event: Readonly<BaseEvent>) => void

  /**
   * User sending messages
   */
  chat: (event: Readonly<ChatEvent>) => void
  /**
   * User join/leave/offline/online/mute/kick/etc
   */
  guildPlayer: (event: Readonly<GuildPlayerEvent>) => void
  /**
   * When a guild emits an event that isn't specific for any player or user.
   * Events such as reach a general guild quest goal.
   */
  guildGeneral: (event: Readonly<GuildGeneralEvent>) => void
  /**
   * In-game events such as interactions blocked/etc.
   *
   * @see MinecraftChatEventType
   */
  minecraftChatEvent: (event: Readonly<MinecraftChatEvent>) => void
  /**
   * User executing a command.
   * Each command execution can send only one command event.
   * If multiple response is needed, either format the text using blank lines/etc. or use {@linkcode CommandFeedbackEvent}
   */
  command: (event: Readonly<CommandEvent>) => void
  /**
   * When a plugin or a component wishes to broadcast a message to all instances.
   */
  broadcast: (event: Readonly<BroadcastEvent>) => void

  /**
   * Command sending a followup responses.
   * This can be used to send multiple responses.
   * Useful when working with long term commands that takes time to finish.
   * It provides a way to give feedback on the command.
   */
  commandFeedback: (event: Readonly<CommandFeedbackEvent>) => void

  /**
   * Internal instance start/connect/disconnect/etc
   */
  instanceStatus: (event: Readonly<InstanceStatusEvent>) => void
  /**
   * Broadcast instance to inform other bridges in the cluster about its existence
   */
  selfBroadcast: (event: Readonly<InstanceSelfBroadcast>) => void

  /**
   *  Broadcast any punishment to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentAdd: (event: Readonly<PunishmentAddEvent>) => void
  /**
   *  Broadcast any punishments removed to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentForgive: (event: Readonly<PunishmentForgiveEvent>) => void

  /**
   * Command used to restart an instance.
   * Note: This is currently only registered in Minecraft instances
   */
  reconnectSignal: (event: Readonly<ReconnectSignal>) => void
  /**
   * Command used to shut down the bridge.
   * It will take some time for the bridge to shut down.
   * Bridge will auto restart if a process monitor is used.
   */
  shutdownSignal: (event: Readonly<ShutdownSignal>) => void

  /**
   * Used to broadcast which in-game username/uuid belongs to which bot.
   * Useful to distinguish in-game between players and bots
   */
  minecraftSelfBroadcast: (event: Readonly<MinecraftSelfBroadcast>) => void
  /**
   * Minecraft instance raw chat
   */
  minecraftChat: (event: Readonly<MinecraftRawChatEvent>) => void
  /**
   * Command used to send a chat message/command through a minecraft instance
   */
  minecraftSend: (event: Readonly<MinecraftSendChat>) => void
  /**
   * Display a useful message coming from the internal components
   */
  statusMessage: (event: Readonly<StatusMessageEvent>) => void

  /**
   * Reports an occurrence of a profanity filtering that occurred.
   */
  profanityWarning: (event: Readonly<ProfanityWarningEvent>) => void
}

/**
 * The instance type the event was created from
 */
export enum InstanceType {
  Main = 'main',

  Plugin = 'plugin',
  Commands = 'commands',
  Moderation = 'moderation',

  Metrics = 'metrics',
  Socket = 'socket',

  Discord = 'discord',
  Minecraft = 'minecraft',

  Logger = 'webhook',
  /**
   * Used for when utils broadcast events
   */
  Util = 'util'
}

/**
 * The channel the event is targeting/coming from
 */
export enum ChannelType {
  Officer = 'officer',
  Public = 'public',
  Private = 'private'
}

/**
 * The severity of the event.
 * This is also used to choose an embed color when displaying messages in discord.
 * Although this is discord specific. This is exposed here for plugins to take advantage of.
 */
export enum Color {
  Good = 0x00_8a_00,
  Info = 0x84_84_00,
  Bad = 0x8a_2d_00,
  Error = 0xff_00_00,
  Default = 0x09_0a_16
}

/**
 * The base interface for every event.
 * There are two main types of events: {@link InformEvent} and {@link SignalEvent}.
 */
export interface BaseEvent extends InstanceIdentifier {
  /**
   * Always set to `true`.

   * This is used when synchronizing with different applications connected by sockets.
   * It is used to prevent an infinite loop when sharing events between each other.
   */
  localEvent: boolean
  /**
   * Every event has unique id usually generated by {@link EventHelper}.
   *
   * Usage example:
   * - a discord user sends a message
   *  - an id is generated and assigned to {@link #eventId}
   *  - the event is forwarded to minecraft instance
   *  - minecraft client shows an error message such as {@link MinecraftChatEventType#Repeat}
   *  - minecraft instance sends {@link MinecraftChatEvent} with a {@link MinecraftChatEvent#originEventId} being the generated id
   *  - discord instance can use that to associate the event with the message the user sent
   */
  eventId: string
}

/**
 * Identifiers every instance MUST have.
 *
 * The different between an instance and a utility is that an instance:
 * - can emit events on its own.
 * - can be stateful
 * - has the ability to interact with other instances
 */
export interface InstanceIdentifier {
  /**
   * The instance name the event is happening in
   */
  readonly instanceName: string
  /**
   * The instance type the event is happening in
   */
  readonly instanceType: InstanceType
}

/**
 * One of the two types events.
 * Inform event is when an instance/component is informing other ones about an event happening.
 */
export type InformEvent = BaseEvent

/**
 * One of the two types events.
 * Send a signal as an event to all (or targeted) instance/component to command them.
 */
export interface SignalEvent extends BaseEvent {
  /**
   * The instance name to send the signal to.
   * Use `undefined` to send to all instances.
   */
  readonly targetInstanceName: string | undefined
}

/**
 * A chat event coming from any instance. e.g. from Discord, Minecraft, or even internally, etc.
 *
 * The event has all the fields formatted and never raw.
 * For example {@link #message} will contain the message content only and will never include any prefix of any kind.
 */
export type ChatEvent = MinecraftGuildChat | MinecraftPrivateChat | DiscordChat

export interface BaseChat extends InformEvent {
  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType

  /**
   * The name of the message sender
   */
  readonly username: string

  /**
   * The message content without any prefix or formatting
   */
  readonly message: string
}

export interface MinecraftChat extends BaseChat {
  readonly instanceType: InstanceType.Minecraft
  readonly hypixelRank: string
}

export interface MinecraftPrivateChat extends MinecraftChat {
  readonly channelType: ChannelType.Private
}

export interface MinecraftGuildChat extends MinecraftChat {
  readonly channelType: ChannelType.Public | ChannelType.Officer
  readonly guildRank: string
}

export interface DiscordChat extends BaseChat {
  readonly instanceType: InstanceType.Discord
  /**
   * The name of the user the message is sent as a reply to.
   * Used if someone is replying to another user's message
   */
  readonly replyUsername: string | undefined
  /**
   * The channel id if exists.
   */
  readonly channelId: string
}

export interface ProfanityWarningEvent extends InformEvent {
  /**
   * The name of the user who sent the message
   */
  readonly username: string

  /**
   * The previous, unfiltered/unmodified message
   */
  readonly originalMessage: string
  /**
   * The resulting, filtered message
   */
  readonly filteredMessage: string

  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType
}

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 */
export enum GuildPlayerEventType {
  /**
   * When a player is requesting to join a guild
   */
  Request = 'request',
  /**
   * When a player joins a guild
   */
  Join = 'join',
  /**
   * When a player leaves a guild
   */
  Leave = 'leave',
  /**
   * When a player is kicked out of a guild
   */
  Kick = 'kick',

  /**
   * When a player is promoted in a guild
   */
  Promote = 'promote',
  /**
   * When a player is demoted in a guild.
   */
  Demote = 'demote',
  /**
   * When a player gets muted in a guild
   */
  Mute = 'mute',
  /**
   * When a player is unmuted in a guild
   */
  Unmute = 'unmute',

  /**
   * When a player goes offline
   */
  Offline = 'offline',
  /**
   * When a player comes online
   */
  Online = 'online'
}

export interface BaseInGameEvent<K extends string> extends InformEvent {
  /**
   * Which event has occurred
   */
  readonly type: K
  /**
   * The message that fired that event
   */
  readonly message: string
  /**
   * The color to display the message at if the receiver supports it.
   */
  readonly color: Color
  /**
   * The channels type to broadcast the message at.
   * @see ChannelType
   */
  readonly channels: (ChannelType.Public | ChannelType.Officer)[]
}

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 *
 * @see GuildPlayerEventType
 */
export interface GuildPlayerEvent extends BaseInGameEvent<GuildPlayerEventType> {
  /**
   * The name of the user who fired that event.
   */
  readonly username: string
}

export enum GuildGeneralEventType {
  /**
   * When a guild quest completion message is shown
   */
  Quest = 'quest'
}

/**
 * When a guild emits an event that isn't specific for any player or user.
 * Events such as reach a general guild quest goal.
 *
 * @see GuildGeneralEventType
 */
export type GuildGeneralEvent = BaseInGameEvent<GuildGeneralEventType>

export enum MinecraftChatEventType {
  /**
   * When a Minecraft server blocks a message due to it being repetitive
   */
  Repeat = 'repeat',
  /**
   * When a Minecraft server blocks a message due to it being harmful/abusive/etc.
   */
  Block = 'block',
  /**
   * When a Minecraft server blocks a message due to it being considered a form of advertising
   */
  Advertise = 'advertise',
  /**
   * When the Minecraft account itself is muted by the server.
   * Not to be confused with {@link GuildPlayerEventType#Mute}
   */
  Muted = 'muted'
}

/**
 * In-game events such as interactions blocked/etc.
 *
 * @see MinecraftChatEventType
 */
export interface MinecraftChatEvent extends BaseInGameEvent<MinecraftChatEventType> {
  /**
   * The original event id {@link BaseEvent#eventId} this event is mentioning.
   *  @see {@link BaseEvent#eventId}
   */
  readonly originEventId: string | undefined
}

/**
 * When a plugin or a component wishes to broadcast a message to all instances.
 */
export interface BroadcastEvent extends InformEvent {
  /**
   * The message to broadcast
   */
  readonly message: string
  /**
   * The color to display the message at if the receiver supports it.
   */
  readonly color: Color
  /**
   * The name of the user associated with the event.
   * If there is no username, `undefined` is used instead.
   */
  readonly username: string | undefined
  /**
   * The channels to broadcast the message to.
   * @see ChannelType
   */
  readonly channels: (ChannelType.Public | ChannelType.Officer)[]
}

/**
 * Used when a command has been executed
 */
export interface CommandEvent extends InformEvent {
  readonly channelType: ChannelType

  /**
   * Only available if the message comes from a DM.
   * Used to reply to the message
   */
  readonly discordChannelId: string | undefined
  /**
   * Whether the command response has already been sent.
   * If not, then each instance will handle the replying themselves instead.
   */
  readonly alreadyReplied: boolean
  /**
   * The name of the user who executed the command
   */
  readonly username: string
  /**
   * The command name that has been executed
   */
  readonly commandName: string
  /**
   * The full command line that has been executed including its arguments
   */
  readonly fullCommand: string
  /**
   * The command response after the execution.
   * Used if @{link #alreadyReplied} is set to `false`
   */
  readonly commandResponse: string
}

/**
 * Used to send feedback messages when a command takes time to execute.
 * Can be used to send multiple responses as well.
 */
export type CommandFeedbackEvent = CommandEvent

/**
 * Events used when an instance changes its status
 */
export interface InstanceStatusEvent extends InformEvent {
  /**
   * The instance event status
   */
  readonly status: Status
  /**
   * Humanly formatted message of the situation
   */
  readonly message: string
}

/**
 * Event sent with every received minecraft chat
 */
export interface MinecraftRawChatEvent extends InformEvent {
  /**
   * The raw chat received from a Minecraft bot
   */
  readonly message: string
}

/**
 * Event sent when a Minecraft bot connects to a server
 */
export interface MinecraftSelfBroadcast extends InformEvent {
  /**
   * The username of the Minecraft bot
   */
  readonly username: string
  /**
   * The UUID of the Minecraft bot
   */
  readonly uuid: string
}

/**
 * Event sent every time synchronization is required.
 * The event is used to informs other application clients about any existing instance.
 */
export type InstanceSelfBroadcast = InformEvent

/**
 * Event sent every time synchronization is required.
 * The event is used to informs other application clients about any existing punishments.
 */
export interface PunishmentAddEvent extends InformEvent {
  /**
   * The punishment type
   */
  readonly type: PunishmentType
  /**
   * The name of the punished user
   */
  readonly userName: string
  /**
   * The Minecraft UUID of the punished user if exists
   */
  readonly userUuid: string | undefined
  /**
   * The Discord ID of the punished user if exists
   */
  readonly userDiscordId: string | undefined

  /**
   * The reason for the punishment
   */
  readonly reason: string
  /**
   * Time when the punishment expires.
   * Unix Epoch in milliseconds.
   */
  readonly till: number
}

/**
 * Event sent every time synchronization is required.
 * The event is used to informs other application clients about any punishment deletion.
 */
export interface PunishmentForgiveEvent extends InformEvent {
  /**
   * Any identifiable data about the user to forgive.
   * Be it the userName or the userUuid, etc.
   */
  readonly userIdentifiers: string[]
}

export enum PunishmentType {
  Mute = 'mute',
  Ban = 'ban'
}

/**
 * Event that contains information that might prove useful.
 * Used to display internal status of the application internal components to the user outside the console.
 */
export interface StatusMessageEvent extends InformEvent {
  /**
   * The message content that explains the status
   */
  readonly message: string
}

/**
 * Signal event used to command a Minecraft instance to send a command through chat
 */
export interface MinecraftSendChat extends SignalEvent {
  /**
   * The command to send
   */
  readonly command: string
}

/**
 * Signal event used to command an instance to reconnect
 */
export type ReconnectSignal = SignalEvent

/**
 * Signal event used to shut down the application
 */
export interface ShutdownSignal extends SignalEvent {
  /**
   * A flag whether to restart after or not
   */
  readonly restart: boolean
}
