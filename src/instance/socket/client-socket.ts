import type { Logger } from 'log4js'
import { WebSocket } from 'ws'

import type Application from '../../application.js'

import type { ApplicationPacket, WebsocketPacket } from './common.js'
import {
  AuthenticationHeader,
  InstancesHeader,
  InternalInstances,
  SocketConnectionInfoPacketName,
  SocketIdHeader
} from './common.js'

export default class ClientSocket {
  private readonly app: Application
  private readonly logger
  private readonly uri: string
  private readonly key: string

  private client: WebSocket | undefined
  private socketId = -1
  private stopped = false

  constructor(app: Application, logger: Logger, uri: string, key: string) {
    this.app = app
    this.logger = logger
    this.uri = uri
    this.key = key

    app.on('all', (name, event) => {
      if (!event.localEvent) return
      if (InternalInstances.includes(event.instanceType)) return
      if (!this.client || this.client.readyState !== WebSocket.OPEN) return

      this.client.send(
        JSON.stringify({
          name: name,
          data: event
        } satisfies ApplicationPacket)
      )
    })

    this.createClient()
  }

  private createClient(): void {
    if (this.stopped) {
      this.logger.warn('Trying to create a socket client when the stopped flag is set. Returning')
      return
    }

    const headers: Record<string, string> = {}
    headers[AuthenticationHeader] = this.key
    headers[InstancesHeader] = JSON.stringify(
      this.app.getAllInstancesIdentifiers().filter((instance) => !InternalInstances.includes(instance.instanceType))
    )
    headers[SocketIdHeader] = this.socketId.toString(10)

    const client = new WebSocket(this.uri, { headers: headers })
    this.client = client

    client.on('open', () => {
      this.logger.debug('Client socket connected.')
      this.app.syncBroadcast()
    })
    client.on('error', (error) => {
      this.logger.error('Socket encountered error: ', error.message, 'Closing socket')
      client.close()
    })
    client.on('close', (code, reason) => {
      this.logger.warn(`Socket Client has disconnected: ${code}, ${reason.toString()}`)
      this.logger.log('Socket is closed. Reconnect will be attempted in 10 second.')
      setTimeout(() => {
        this.createClient()
      }, 10_000)
    })

    client.on('message', (rawData) => {
      const packet = JSON.parse(rawData as unknown as string) as WebsocketPacket

      if (packet.name === SocketConnectionInfoPacketName) {
        this.socketId = packet.data.socketId
        return
      }

      packet.data.localEvent = false
      if (InternalInstances.includes(packet.data.instanceType)) {
        this.logger.warn(
          `Socket server has sent an event with instanceType=${packet.data.instanceType}.` +
            ` dropping it since it is considered an internal type.`
        )
        return
      }
      this.app.emit(packet.name, packet.data)
    })
  }

  public shutdown(): void {
    this.client?.close()
  }
}
