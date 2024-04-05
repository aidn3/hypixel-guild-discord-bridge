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
   * Broadcast instance to inform other applications nodes in cluster about its existence
   */
  selfBroadcast: (event: InstanceSelfBroadcast) => void

  /**
   *  Broadcast any punishment to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentAdd: (event: PunishmentAddEvent) => void
  /**
   *  Broadcast any punishment forgiveness to other instances. Such as mute, ban, etc.
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
   * Bridge will auto restart if a service monitor is used.
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
}

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

export enum ChannelType {
  OFFICER = 'officer',
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export interface BaseEvent {
  localEvent: boolean
}

interface InformEvent extends BaseEvent {
  readonly instanceName: string
  readonly instanceType: InstanceType
}

interface SignalEvent extends BaseEvent {
  /**
   * undefined is strictly used for global target.
   */
  readonly targetInstanceName: string | undefined
}

export interface ChatEvent extends InformEvent {
  readonly channelType: ChannelType
  readonly channelId: string | undefined
  readonly username: string
  readonly replyUsername: string | undefined
  readonly message: string
}

export enum EventType {
  // noinspection JSUnusedGlobalSymbols
  /**
   * Indicates an automated response/action.
   * Used for custom plugins, etc.
   */
  AUTOMATED = 'automated',
  REQUEST = 'request',
  JOIN = 'join',
  LEAVE = 'leave',
  KICK = 'kick',

  // Guild quest completion
  QUEST = 'quest',

  PROMOTE = 'promote',
  DEMOTE = 'demote',
  MUTE = 'mute',
  UNMUTE = 'unmute',

  OFFLINE = 'offline',
  ONLINE = 'online',

  REPEAT = 'repeat',
  BLOCK = 'block'
}

export enum Severity {
  GOOD = 0x00_8a_00,
  INFO = 0x84_84_00,
  BAD = 0x8a_2d_00,
  ERROR = 0xff_00_00,
  DEFAULT = 0x09_0a_16
}

export interface ClientEvent extends InformEvent {
  readonly channelType: ChannelType
  readonly eventType: EventType
  readonly username: string | undefined
  readonly severity: Severity
  readonly message: string
  readonly removeLater: boolean
}

export interface CommandEvent extends InformEvent {
  readonly channelType: ChannelType
  /**
   * Only available if the message comes from a DM.
   * Used to reply to the message
   */
  readonly discordChannelId?: string
  readonly alreadyReplied: boolean
  readonly username: string
  readonly commandName: string
  readonly fullCommand: string
  readonly commandResponse: string
}

export enum InstanceEventType {
  create,
  start,
  end,
  connect,
  disconnect,
  conflict,
  kick
}

export interface InstanceEvent extends InformEvent {
  readonly type: InstanceEventType
  readonly message: string
}

export interface MinecraftRawChatEvent extends InformEvent {
  readonly message: string
}

export interface MinecraftSelfBroadcast extends InformEvent {
  readonly username: string
  readonly uuid: string
}

export type InstanceSelfBroadcast = InformEvent

export interface PunishmentAddEvent extends InformEvent {
  readonly type: PunishmentType
  readonly userName: string
  readonly userUuid: string | undefined
  readonly userDiscordId: string | undefined

  readonly reason: string
  readonly till: number
}

export interface PunishmentForgiveEvent extends InformEvent {
  /**
   * Any identifiable data about the userIdentifiers. Be it the userName or the userUuid
   */
  readonly userIdentifiers: string[]
}

export enum PunishmentType {
  MUTE = 'mute',
  BAN = 'ban'
}

export interface MinecraftSendChat extends SignalEvent {
  readonly command: string
}

export type ReconnectSignal = SignalEvent

export interface ShutdownSignal extends SignalEvent {
  readonly restart: boolean
}
