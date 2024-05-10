/**
 * All available High Level events
 */
export interface ApplicationEvents {
  /**
   * Receive all events
   * @param name event name
   * @param event event object
   */
  '*': <T extends BaseEvent>(name: string, event: T) => void

  /**
   * User sending messages
   */
  chat: (event: ChatEvent) => void
  /**
   * User join/leave/offline/online/mute/kick/etc
   */
  event: (event: ClientEvent) => void
  /**
   * User executing a command
   */
  command: (event: CommandEvent) => void

  /**
   * Internal instance start/connect/disconnect/etc
   */
  instance: (event: InstanceEvent) => void
  /**
   * Broadcast instance to inform other application nodes in the cluster about its existence
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
}

/**
 * The instance type the event was created from
 */
export enum InstanceType {
  MAIN = 'main',
  PLUGIN = 'plugin',

  METRICS = 'metrics',
  SOCKET = 'socket',
  COMMANDS = 'commands',

  DISCORD = 'discord',
  MINECRAFT = 'minecraft',
  Logger = 'webhook'
}

/**
 * The channel the event is targeting/coming from
 */
export enum ChannelType {
  OFFICER = 'officer',
  PUBLIC = 'public',
  PRIVATE = 'private'
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

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 */
export enum EventType {
  // noinspection JSUnusedGlobalSymbols
  /**
   * Indicates an automated response/action.
   * Used for custom plugins, etc.
   */
  AUTOMATED = 'automated',
  /**
   * When a player is reqeusting to join a guild
   */
  REQUEST = 'request',
  /**
   * When a player joins a guild
   */
  JOIN = 'join',
  /**
   * When a player leaves a guild
   */
  LEAVE = 'leave',
  /**
   * When a player is kicked out of a guild
   */
  KICK = 'kick',

  /**
   * When a guild quest completion message is shown
   */
  QUEST = 'quest',

  /**
   * When a player is promoted in a guild
   */
  PROMOTE = 'promote',
  /**
   * When a player is demoted in a guild.
   */
  DEMOTE = 'demote',
  /**
   * When a player gets muted in a guild
   */
  MUTE = 'mute',
  /**
   * When a player is unmuted in a guild
   */
  UNMUTE = 'unmute',

  /**
   * When a player goes offline
   */
  OFFLINE = 'offline',
  /**
   * When a player comes online
   */
  ONLINE = 'online',

  /**
   * When a Minecraft server blocks a message due to it being repetitive
   */
  REPEAT = 'repeat',
  /**
   * When a Minecraft server blocks a message due to it being harmful/abusive/etc.
   */
  BLOCK = 'block',

  /**
   * When the Minecraft account itself is muted by the server.
   * Not to be confused with {@link #MUTE}
   */
  MUTED = 'muted'
}

/**
 * The severity of the event.
 * This is used to choose an embed color when displaying in discord
 */
export enum Severity {
  GOOD = 0x00_8a_00,
  INFO = 0x84_84_00,
  BAD = 0x8a_2d_00,
  ERROR = 0xff_00_00,
  DEFAULT = 0x09_0a_16
}

/**
 * In-game guild events such as joining/leaving/online/offline/etc.
 *
 * @see EventType
 */
export interface ClientEvent extends InformEvent {
  /**
   * The channel type the message is coming from
   * @see ChannelType
   */
  readonly channelType: ChannelType
  /**
   * Which event has occurred
   */
  readonly eventType: EventType
  /**
   * The name of the user who fired that event.
   * If there is no username, `undefined` is used instead
   */
  readonly username: string | undefined
  /**
   * @see Severity
   */
  readonly severity: Severity
  /**
   * The message that fired that event
   */
  readonly message: string
  /**
   * Whether to delete any notification that has been sent due to this event.
   * Used to reduce spam if an event occurs too often.
   */
  readonly removeLater: boolean
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
 * Enum containing all available instance statuses
 */
export enum InstanceEventType {
  /**
   * When an instance is freshly created
   */
  create,
  /**
   * When an instance is starting but not connected yet
   */
  start,
  /**
   * When an instance has gracefully ended
   */
  end,
  /**
   * When an instance is connecting
   */
  connect,
  /**
   * When an instance is temporarily disconnected
   */
  disconnect,
  /**
   * When an instance has conflicted with another instance.
   * Receiving this event means the instance won't retry to reconnect.
   */
  conflict,
  /**
   * when an instance is kicked from a server
   */
  kick
}

/**
 * Events used when an instance changes its status
 */
export interface InstanceEvent extends InformEvent {
  /**
   * The instance event status
   */
  readonly type: InstanceEventType
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
  MUTE = 'mute',
  BAN = 'ban'
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
