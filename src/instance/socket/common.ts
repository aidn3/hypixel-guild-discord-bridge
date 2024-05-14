import type { BaseEvent } from '../../common/application-event.js'

export interface WebsocketPacket {
  name: string
  data: BaseEvent
}

export const AuthenticationHeader = 'authentication-header'
