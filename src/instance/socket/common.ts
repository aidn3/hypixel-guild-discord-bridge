import type { BaseEvent } from '../../common/application-event'

export interface WebsocketPacket {
  name: string
  data: BaseEvent
}

export const AuthenticationHeader = 'authentication-header'
