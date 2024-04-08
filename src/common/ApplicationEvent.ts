import { LOCATION, SCOPE } from "./ClientInstance"

export interface BaseEvent {
  localEvent: boolean
}

interface InformEvent extends BaseEvent {
  instanceName: string
  location: LOCATION
}

interface SignalEvent extends BaseEvent {
  /**
   * undefined is strictly used for global target.
   */
  targetInstanceName: string | undefined
}

export interface ChatEvent extends InformEvent {
  scope: SCOPE
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
  AUTOMATED = "automated",
  REQUEST = "request",
  JOIN = "join",
  LEAVE = "leave",
  KICK = "kick",

  // Guild quest completion
  QUEST = "quest",

  PROMOTE = "promote",
  DEMOTE = "demote",
  MUTE = "mute",
  UNMUTE = "unmute",

  OFFLINE = "offline",
  ONLINE = "online",

  REPEAT = "repeat",
  BLOCK = "block",

  /**
   * @deprecated Command api in "event" event has been depreciated. It will be completely removed and replaced.
   */
  COMMAND = "command"
}

export interface ClientEvent extends InformEvent {
  scope: SCOPE
  name: EventType
  username: string | undefined
  severity: number
  message: string
  removeLater: boolean
}

export interface CommandEvent extends InformEvent {
  scope: SCOPE
  username: string
  commandName: string
  fullCommand: string
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

/**
 * @deprecated Command api for a specific instance is deprecated. Use the more broad api events.
 */
export interface MinecraftCommandResponse extends InformEvent {
  username: string
  commandName: string
  fullCommand: string
  commandResponse: string
}

export interface MinecraftSendChat extends SignalEvent {
  command: string
}

export type ReconnectSignal = SignalEvent

export interface ShutdownSignal extends SignalEvent {
  restart: boolean
}
