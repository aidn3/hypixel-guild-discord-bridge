import type { Status } from './client-instance.js'

/**
 * All available High Level events
 */
export interface ApplicationEvents {
  /**
   * Receive all events
   * @param name event name
   * @param event event object
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  all: (name: string, event: BaseEvent) => void

  /**
   * User sending messages
   */
  chat: (event: ChatEvent) => void
  /**
   * User join/leave/offline/online/mute/kick/etc
   */
  guildPlayer: (event: GuildPlayerEvent) => void
  /**
   * When a guild emits an event that isn't specific for any player or user.
   * Events such as reach a general guild quest goal.
   */
  guildGeneral: (event: GuildGeneralEvent) => void
  /**
   * In-game events such as interactions blocked/etc.
   *
   * @see MinecraftChatEventType
   */
  minecraftChatEvent: (event: MinecraftChatEvent) => void
  /**
   * User executing a command.
   * Each command execution can send only one command event.
   * If multiple response is needed, either format the text using blank lines/etc. or use {@linkcode CommandFeedbackEvent}
   */
  command: (event: CommandEvent) => void
  /**
   * When a plugin wishes to broadcast a message to all instances.
   */
  pluginBroadcast: (event: PluginBroadcastEvent) => void

  /**
   * Command sending a followup responses.
   * This can be used to send multiple responses.
   * Useful when working with long term commands that takes time to finish.
   * It provides a way to give feedback on the command.
   */
  commandFeedback: (event: CommandFeedbackEvent) => void

  /**
   * Internal instance start/connect/disconnect/etc
   */
  instanceStatus: (event: InstanceStatusEvent) => void
  /**
   * Broadcast instance to inform other bridges in the cluster about its existence
   */
  selfBroadcast: (event: InstanceSelfBroadcast) => void

  /**
   *  Broadcast any punishment to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentAdd: (event: PunishmentAddEvent) => void
  /**
   *  Broadcast any punishments removed to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentForgive: (event: PunishmentForgiveEvent) => void

  /**
   * Command used to restart an instance.
   * Note: This is currently only registered in Minecraft instances
   */
  reconnectSignal: (event: ReconnectSignal) => void
  /**
   * Command used to shut down the bridge.
   * It will take some time for the bridge to shut down.
   * Bridge will auto restart if a process monitor is used.
   */
  shutdownSignal: (event: ShutdownSignal) => void

  /**
   * Used to broadcast which in-game username/uuid belongs to which bot.
   * Useful to distinguish in-game between players and bots
   */
  minecraftSelfBroadcast: (event: MinecraftSelfBroadcast) => void
  /**
   * Minecraft instance raw chat
   */
  minecraftChat: (event: MinecraftRawChatEvent) => void
  /**
   * Command used to send a chat message/command through a minecraft instance
   */
  minecraftSend: (event: MinecraftSendChat) => void
  /**
   * Display a useful message coming from the internal components
   */
  statusMessage: (event: StatusMessageEvent) => void

  /**
   * Reports an occurrence of a profanity filtering that occurred.
   */
  profanityWarning: (event: ProfanityWarningEvent) => void
}

/**
 * The instance type the event was created from
 */
export enum InstanceType {
  Main = 'main',
  Plugin = 'plugin',

  Metrics = 'metrics',
  Socket = 'socket',
  Commands = 'commands',

  Discord = 'discord',
  Minecraft = 'minecraft',
  Logger = 'webhook'
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
export interface BaseEvent {
  /**
   * Always set to `true`.

   * This is used when synchronizing with different applications connected by sockets.
   * It is used to prevent an infinite loop when sharing events between each other.
   */
  localEvent: boolean
}

/**
 * One of the two types events.
 * Inform event is when an instance/component is informing other ones about an event happening.
 */
interface InformEvent extends BaseEvent {
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
 * Send a signal as an event to all (or targeted) instance/component to command them.
 */
interface SignalEvent extends BaseEvent {
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
export interface ChatEvent extends InformEvent {
  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType
  /**
   * The channel id if exists.
   * This is only set if the message is coming from a discord channel.
   */
  readonly channelId: string | undefined
  /**
   * The name of the message sender
   */
  readonly username: string
  /**
   * The name of the user the message is sent as a reply to.
   * Used if someone is replying to another user's message
   */
  readonly replyUsername: string | undefined
  /**
   * The message content without any prefix or formatting
   */
  readonly message: string
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

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 *
 * @see GuildPlayerEventType
 */
export interface GuildPlayerEvent extends InformEvent {
  /**
   * Which event has occurred
   */
  readonly type: GuildPlayerEventType
  /**
   * The name of the user who fired that event.
   */
  readonly username: string
  /**
   * The message that fired that event
   */
  readonly message: string
}

enum GuildGeneralEventType {
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
export interface GuildGeneralEvent extends InformEvent {
  /**
   * Which event has occurred
   */
  readonly type: GuildGeneralEventType
  /**
   * The message that fired that event
   */
  readonly message: string
}

enum MinecraftChatEventType {
  /**
   * When a Minecraft server blocks a message due to it being repetitive
   */
  Repeat = 'repeat',
  /**
   * When a Minecraft server blocks a message due to it being harmful/abusive/etc.
   */
  Block = 'block',
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
export interface MinecraftChatEvent extends InformEvent {
  /**
   * Which event has occurred
   */
  readonly type: MinecraftChatEventType
  /**
   * The message that fired that event
   */
  readonly message: string
}

/**
 * When a plugin wishes to broadcast a message to all instances.
 */
export interface PluginBroadcastEvent extends InformEvent {
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
   * The channel type to broadcast the message at.
   * @see ChannelType
   */
  readonly channel: ChannelType.Public | ChannelType.Officer
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
  readonly discordChannelId?: string
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
   // TODO: change to "expiresAt"
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
