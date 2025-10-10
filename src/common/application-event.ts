import type { Status, StatusVisibility } from './connectable-instance.js'
import type { DiscordUser, MinecraftUser, User } from './user'

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
  all: (name: keyof ApplicationEvents, event: Readonly<BaseEvent>) => void

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
   * @see MinecraftReactiveEventType
   */
  minecraftChatEvent: (event: Readonly<MinecraftReactiveEvent>) => void
  /**
   * User executing a command.
   * Each command execution can send only one command event.
   * If multiple response is needed, either format the text using blank lines/etc. or use {@linkcode CommandFeedbackEvent}
   */
  command: (event: Readonly<CommandEvent>) => void
  /**
   * Command sending a followup responses.
   * This can be used to send multiple responses.
   * Useful when working with long term commands that takes time to finish.
   * It provides a way to give feedback on the command.
   */
  commandFeedback: (event: Readonly<CommandFeedbackEvent>) => void
  /**
   * When a plugin or a component wishes to broadcast a message to all instances.
   */
  broadcast: (event: Readonly<BroadcastEvent>) => void

  /**
   * Internal instance start/connect/disconnect/etc
   */
  instanceStatus: (event: Readonly<InstanceStatusEvent>) => void
  /**
   * Announce instance existence to other instances
   */
  instanceAnnouncement: (event: Readonly<InstanceAnnouncement>) => void
  /**
   * Display a useful message coming from the internal components
   */
  instanceMessage: (event: Readonly<InstanceMessage>) => void
  /**
   * Signal used to shut down/restart an instance.
   *
   * Signaling to shut down the application is possible.
   * It will take some time for the application to shut down.
   * Application will auto restart if a process monitor is used.
   */
  instanceSignal: (event: Readonly<InstanceSignal>) => void

  /**
   *  Broadcast any punishment to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentAdd: (event: Readonly<Punishment>) => void
  /**
   *  Broadcast any punishments removed to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentForgive: (event: Readonly<PunishmentForgive>) => void
  /**
   * Reports an occurrence of a profanity filtering that occurred.
   */
  profanityWarning: (event: Readonly<ProfanityWarningEvent>) => void

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

  Prometheus = 'prometheus',

  Discord = 'discord',
  Minecraft = 'minecraft',

  /**
   * Used for when utils broadcast events
   */
  Utility = 'utility'
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
   * Every event has unique id usually generated by {@link EventHelper}.
   *
   * Usage example:
   * - a discord user sends a message
   *  - an id is generated and assigned to {@link #eventId}
   *  - the event is forwarded to minecraft instance
   *  - minecraft client shows an error message such as {@link MinecraftReactiveEventType#Repeat}
   *  - minecraft instance sends {@link MinecraftReactiveEvent} with a {@link ReplyEvent#originEventId} being the generated id
   *  - discord instance can use that to associate the event with the message the user sent
   */
  readonly eventId: string
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
  readonly targetInstanceName: string[]
}

/**
 * Used to associate an event with a previous one
 * @see BaseEvent#eventId
 */
export interface ReplyEvent extends BaseEvent {
  /**
   * The original event id {@link BaseEvent#eventId} this event is mentioning.
   *  @see {@link BaseEvent#eventId}
   */
  readonly originEventId: string
}

/**
 * Additional properties of minecraft related events
 */
export interface MinecraftRawMessage {
  /**
   * The raw message with all § color encodings
   */
  readonly rawMessage: string
}

// values must be numbers to be comparable
export enum Permission {
  Anyone,
  Helper,
  Officer,
  Admin
}

/**
 * A chat event coming from any instance. e.g. from Discord, Minecraft, or even internally, etc.
 *
 * The event has all the fields formatted and never raw.
 * For example {@link #message} will contain the message content only and will never include any prefix of any kind.
 */
export type ChatEvent = ChatLike

export type ChatLike =
  | MinecraftGuildChat
  | MinecraftPrivateChat
  | DiscordChat
  | (BaseChat & { instanceType: Exclude<InstanceType, InstanceType.Discord | InstanceType.Minecraft> })

export interface BaseChat extends InformEvent {
  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType

  /**
   * The message sender
   */
  readonly user: User
  /**
   * The message content without any prefix or formatting
   */
  readonly message: string
}

export interface MinecraftChat extends BaseChat, MinecraftRawMessage {
  readonly instanceType: InstanceType.Minecraft
  readonly hypixelRank: string
  /**
   * Minecraft user
   */
  readonly user: MinecraftUser
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
   * sender of the message
   */
  readonly user: DiscordUser
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

export interface BasePunishment {
  /**
   * The punishment type
   */
  readonly type: PunishmentType
  /**
   * The reason for the punishment
   */
  readonly reason: string
  /**
   * Time when the punishment was created.
   * Unix Epoch in milliseconds.
   */
  readonly createdAt: number
  /**
   * Time when the punishment expires.
   * Unix Epoch in milliseconds.
   */
  readonly till: number
}

export interface Punishment extends BasePunishment, InformEvent {
  /**
   * The punished user
   */
  readonly user: User
}

export interface PunishmentForgive extends InformEvent {
  /**
   * The user to forgive
   */
  readonly user: User
}

export enum PunishmentType {
  Mute = 'mute',
  Ban = 'ban'
}

export interface ProfanityWarningEvent extends InformEvent {
  /**
   * The name of the user who sent the message
   */
  readonly user: User

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
   * @see GuildPlayerEventType#Muted
   * @see MinecraftReactiveEventType#GuildMuted
   */
  Mute = 'mute',
  /**
   * When a player is unmuted in a guild
   */
  Unmute = 'unmute',

  /**
   * When the currently used Minecraft account is muted in a guild.
   *
   * This the notification sent before {@link MinecraftReactiveEventType#GuildMuted}.
   *
   * Event not to be confused with {@link #Mute}.
   * @see GuildPlayerEventType#Unmuted
   * @see GuildPlayerEventType#Mute
   * @see MinecraftReactiveEventType#GuildMuted
   */
  Muted = 'muted',
  /**
   * When the currently used Minecraft account is unmuted in a guild.
   *
   * Event not to be confused with {@link #Unmute}.
   * @see GuildPlayerEventType#Muted
   * @see GuildPlayerEventType#Mute
   * @see MinecraftReactiveEventType#GuildMuted
   */
  Unmuted = 'unmuted',

  /**
   * When a player goes offline
   */
  Offline = 'offline',
  /**
   * When a player comes online
   */
  Online = 'online'
}

export interface BaseInGameEvent<K extends string> extends InformEvent, MinecraftRawMessage {
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

export interface BaseGuildPlayerEvent extends MinecraftRawMessage {
  /**
   * The name of the user who fired that event.
   */
  readonly user: MinecraftUser
}

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 * @see GuildPlayerEventType
 */
export type GuildPlayerEvent = GuildPlayerResponsible | GuildPlayerSolo

export type GuildPlayerResponsibleTypes =
  | GuildPlayerEventType.Muted
  | GuildPlayerEventType.Kick
  | GuildPlayerEventType.Mute
  | GuildPlayerEventType.Unmute

export type GuildPlayerSoloTypes = Exclude<GuildPlayerEventType, GuildPlayerResponsibleTypes>

export type GuildPlayerSolo = BaseGuildPlayerEvent & BaseInGameEvent<GuildPlayerSoloTypes>

export interface GuildPlayerResponsible extends BaseGuildPlayerEvent, BaseInGameEvent<GuildPlayerResponsibleTypes> {
  /**
   * The person who took action to result in this event
   */
  readonly responsible: MinecraftUser
}

export enum GuildGeneralEventType {
  /**
   * When a guild quest completion message is shown
   */
  Quest = 'quest',
  /**
   * When the guild is leveled up.
   * e.g. In-Game message "The Guild has reached Level 127!"
   */
  Level = 'level'
}

/**
 * When a guild emits an event that isn't specific for any player or user.
 * Events such as reach a general guild quest goal.
 * @see GuildGeneralEventType
 */
export type GuildGeneralEvent = BaseInGameEvent<GuildGeneralEventType> & MinecraftRawMessage

export enum MinecraftReactiveEventType {
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
  Muted = 'muted',
  /**
   * When the Minecraft account not in a guild.
   */
  RequireGuild = 'require_guild',
  /**
   * Minecraft account is in a guild but does not have permission to access officer chat.
   */
  NoOfficer = 'no_officer',

  /**
   * Minecraft account is in a guild and the guild moderation has muted the account
   * making it unable to send chat messages.
   *
   * {@link GuildPlayerEventType#Muted} is sent before to indicate the muted state.
   * @see GuildPlayerEventType#Mute
   * @see GuildPlayerEventType#Muted
   */
  GuildMuted = 'guild_muted'
}

/**
 * In-game events such as interactions blocked/etc.
 * @see MinecraftReactiveEventType
 */
export interface MinecraftReactiveEvent extends ReplyEvent, MinecraftRawMessage {
  /**
   * Which event has occurred
   */
  readonly type: MinecraftReactiveEventType
  /**
   * The message that fired that event
   */
  readonly message: string
  /**
   * The color to display the message at if the receiver supports it.
   */
  readonly color: Color
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
   * The user associated with the event.
   * If there is no user, `undefined` is used instead.
   */
  readonly user: User | undefined
  /**
   * The channels to broadcast the message to.
   * @see ChannelType
   */
  readonly channels: (ChannelType.Public | ChannelType.Officer)[]
}

/**
 * Used when a command has been executed
 */
export interface BaseCommandEvent extends InformEvent, ReplyEvent {
  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType
  /**
   * The user who executed the command
   */
  readonly user: User
  /**
   * The command name that has been executed
   */
  readonly commandName: string
  /**
   * The command response after the execution.
   * Used if @{link #alreadyReplied} is set to `false`
   */
  readonly commandResponse: string
}

export interface DiscordCommandEvent extends BaseCommandEvent {
  instanceType: InstanceType.Discord
  /**
   * The user who executed the command
   */
  user: DiscordUser
}

export interface MinecraftCommandEvent extends BaseCommandEvent {
  instanceType: InstanceType.Minecraft
  /**
   * The user who executed the command
   */
  user: MinecraftUser
}

export type CommandLike =
  | DiscordCommandEvent
  | MinecraftCommandEvent
  | (BaseCommandEvent & { instanceType: Exclude<InstanceType, InstanceType.Discord | InstanceType.Minecraft> })

/**
 * Used when a command has been executed
 */
export type CommandEvent = CommandLike

/**
 * Used to send feedback messages when a command takes time to execute.
 * Can be used to send multiple responses as well.
 */
export type CommandFeedbackEvent = CommandLike

export enum LinkType {
  None = 'none',
  Inference = 'inference',
  Confirmed = 'confirmed'
}

export type Link = NoneLink | InferenceLink | ConfirmedLink

export interface BaseLink<T extends LinkType> {
  type: T
}

export type NoneLink = BaseLink<LinkType.None>

export interface InferenceLink extends BaseLink<LinkType.Inference> {
  link: LinkInfo
}

export interface ConfirmedLink extends BaseLink<LinkType.Confirmed> {
  link: LinkInfo
}

export interface LinkInfo {
  uuid: string
  discordId: string
}

/**
 * Events used when an instance changes its status
 */
export interface InstanceStatusEvent extends InformEvent {
  /**
   * The instance event status
   */
  readonly status: Status
  /**
   * Whether the event should be shown to the end user
   */
  readonly visibility: StatusVisibility.Show | StatusVisibility.Silent
  /**
   * Humanly formatted message of the situation
   */
  readonly message: string
}

/**
 * Event sent with every received minecraft chat
 */
export interface MinecraftRawChatEvent extends InformEvent, MinecraftRawMessage {
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
export type InstanceAnnouncement = InformEvent

export enum InstanceMessageType {
  MinecraftAuthenticationCode = 'minecraft-authentication-code',
  MinecraftTruncateMessage = 'minecraft-truncate-message'
}

/**
 * Event that contains information that might prove useful.
 * Used to display internal status of the application internal components to the user outside the console.
 */
interface BaseInstanceMessage extends InformEvent {
  /**
   * Type of the message
   */
  type: InstanceMessageType
  /**
   * The message content that explains the status
   */
  readonly message: string
}

export type InstanceMessage = BaseInstanceMessage | (BaseInstanceMessage & ReplyEvent)

/**
 * Signal event used to command a Minecraft instance to send a command through chat
 */
export interface MinecraftSendChat extends SignalEvent {
  /**
   * The command to send
   */
  readonly command: string
  /**
   * When to handle the command.
   *
   * Warning: spamming multiple commands using <code>instant</code>
   * can result in the client being throttled, which can not be properly detected
   * due to the nature of <code>instant</code> not leaving room to such detections.
   *
   * Warning: Any priority other than <code>default</code> can lead to inaccurate detections,
   * be it regarding {@link InformEvent#eventId} or whether the command even succeed in execution.
   */
  readonly priority: MinecraftSendChatPriority
}

export enum MinecraftSendChatPriority {
  /**
   * let the instance decide when to handle the command.
   */
  Default = 'default',
  /**
   * Only use <code>high</code> for responsive interactions,
   * since it will put the command at the top of the queue
   * and disregard any high cooldown to send the command as soon as possible.
   */
  High = 'high',
  /**
   * Only use <code>instant</code> for critical actions,
   * since it will completely disregard any queue and cooldown instantly sending it.
   */
  Instant = 'instant'
}

/**
 * Signal event used to control the application and instances
 */
export interface InstanceSignal extends SignalEvent {
  /**
   * A flag indicating the signal
   */
  readonly type: InstanceSignalType
}

export enum InstanceSignalType {
  Shutdown = 'shutdown',
  Restart = 'restart'
}
