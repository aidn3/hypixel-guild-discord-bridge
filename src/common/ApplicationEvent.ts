import {LOCATION, SCOPE} from "./ClientInstance"

interface BaseEvent {
}

interface InformEvent {
    instanceName: string
}

interface LocationEvent {
    location: LOCATION
}

interface SignalEvent {
    targetInstanceName: string | undefined
}

export interface ChatEvent extends BaseEvent, InformEvent, LocationEvent {
    scope: SCOPE
    channelId: string | undefined
    username: string
    replyUsername: string | undefined
    message: string
}

export interface ClientEvent extends BaseEvent, InformEvent, LocationEvent {
    scope: SCOPE
    name: string
    username: string | undefined
    severity: string
    message: string
    removeLater: boolean
}

export interface CommandEvent extends BaseEvent, InformEvent, LocationEvent {
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

export interface InstanceEvent extends BaseEvent, InformEvent, LocationEvent {
    type: InstanceEventType
    reason: string | undefined
}


export interface MinecraftRawChatEvent extends BaseEvent, InformEvent, LocationEvent {
    message: string
}

export interface MinecraftSelfBroadcast extends BaseEvent, InformEvent, LocationEvent {
    username: string
    uuid: string
}

export interface InstanceSelfBroadcast extends BaseEvent, InformEvent, LocationEvent {
}


export interface MinecraftSendChat extends BaseEvent, SignalEvent, LocationEvent {
    command: string
}


export interface InstanceRestartSignal extends BaseEvent, SignalEvent {
}
