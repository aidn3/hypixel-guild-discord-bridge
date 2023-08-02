import {LOCATION, SCOPE} from "./ClientInstance"

export interface BaseEvent {
    localEvent: boolean
}

interface InformEvent extends BaseEvent {
    instanceName: string
    location: LOCATION
}

interface SignalEvent extends BaseEvent {
    targetInstanceName: string | null
}

export interface ChatEvent extends InformEvent {
    scope: SCOPE
    channelId: string | undefined
    username: string
    replyUsername: string | undefined
    message: string
}

export enum EventType {
    REQUEST = "request",
    JOIN = "join",
    LEAVE = "leave",
    KICK = "kick",

    PROMOTE = "promote",
    DEMOTE = "demote",
    MUTE = "mute",
    UNMUTE = "unmute",

    OFFLINE = "offline",
    ONLINE = "online",


    REPEAT = "repeat",
    BLOCK = "block",

    COMMAND = "command",
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
    create, start, end,
    connect, disconnect,
    conflict, kick,
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

export interface InstanceSelfBroadcast extends InformEvent {
}

export interface MinecraftCommandResponse extends InformEvent {
    username: string
    commandName: string
    fullCommand: string
    commandResponse: string
}

export interface MinecraftSendChat extends SignalEvent {
    command: string
}


export interface InstanceRestartSignal extends SignalEvent {
}

export interface ShutdownSignal extends SignalEvent {
}
