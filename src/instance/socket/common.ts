import type { BaseEvent } from '../../common/ApplicationEvent'

export interface WebsocketPacket {
  name: string
  data: BaseEvent
}

export const AuthenticationHeader = 'authentication-header'
