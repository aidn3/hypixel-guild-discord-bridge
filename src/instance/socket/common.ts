import type { ApplicationEvents, BaseEvent } from '../../common/application-event.js'
import { InstanceType } from '../../common/application-event.js'

export type WebsocketPacket = ApplicationPacket | SocketPacket

export interface ApplicationPacket {
  name: keyof ApplicationEvents
  data: BaseEvent
}

export interface SocketPacket {
  name: typeof SocketConnectionInfoPacketName
  data: SocketConnectionInfo
}

export const AuthenticationHeader = 'authentication-header'
export const InstancesHeader = 'instances-header'

export const SocketIdHeader = 'socket-id-header'

export const SocketConnectionInfoPacketName = 'internal/socket/connection-info'
export interface SocketConnectionInfo {
  socketId: number
}

export const InternalInstances = [
  InstanceType.Main,
  InstanceType.Socket,
  InstanceType.Metrics,
  InstanceType.Moderation,
  InstanceType.Util
]
