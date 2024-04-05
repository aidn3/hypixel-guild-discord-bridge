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
  instanceName: string
  instanceType: InstanceType
}

interface SignalEvent extends BaseEvent {
  /**
   * undefined is strictly used for global target.
   */
  targetInstanceName: string | undefined
}

export interface ChatEvent extends InformEvent {
  channelType: ChannelType
  channelId: string | undefined
  username: string
  replyUsername: string | undefined
  message: string
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

export interface ClientEvent extends InformEvent {
  channelType: ChannelType
  name: EventType
  username: string | undefined
  severity: number
  message: string
  removeLater: boolean
}

export interface CommandEvent extends InformEvent {
  channelType: ChannelType
  /**
   * Only available if the message comes from a DM.
   * Used to reply to the message
   */
  discordChannelId?: string
  alreadyReplied: boolean
  username: string
  commandName: string
  fullCommand: string
  commandResponse: string
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
  type: InstanceEventType
  message: string
}

export interface MinecraftRawChatEvent extends InformEvent {
  message: string
}

export interface MinecraftSelfBroadcast extends InformEvent {
  username: string
  uuid: string
}

export type InstanceSelfBroadcast = InformEvent

export interface PunishmentAddEvent extends InformEvent {
  type: PunishmentType
  userName: string
  userUuid: string | undefined
  userDiscordId: string | undefined

  reason: string
  till: number
}

export interface PunishmentForgiveEvent extends InformEvent {
  /**
   * Any identifiable data about the userIdentifiers. Be it the userName or the userUuid
   */
  userIdentifiers: string[]
}

export enum PunishmentType {
  MUTE = 'mute',
  BAN = 'ban'
}

export interface MinecraftSendChat extends SignalEvent {
  command: string
}

export type ReconnectSignal = SignalEvent

export interface ShutdownSignal extends SignalEvent {
  restart: boolean
}
