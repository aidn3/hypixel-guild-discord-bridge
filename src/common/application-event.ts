export enum InstanceType {
  MAIN = 'main',
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
