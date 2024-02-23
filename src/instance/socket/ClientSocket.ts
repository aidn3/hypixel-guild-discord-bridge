import { Logger } from 'log4js'
import WebSocket = require('ws')
import Application, { ApplicationEvents } from '../../Application'
import { AuthenticationHeader, WebsocketPacket } from './ServerSocket'

export default class ClientSocket {
  private readonly app: Application
  private readonly logger
  private readonly uri: string
  private readonly key: string

  private client: WebSocket | undefined
  private stopped = false

  constructor(app: Application, logger: Logger, uri: string, key: string) {
    this.app = app
    this.logger = logger
    this.uri = uri
    this.key = key

    app.on('*', (name, event) => {
      if (event.localEvent && this.client) {
        this.client.send(
          JSON.stringify({
            name: name,
            data: event
          } satisfies WebsocketPacket)
        )
      }
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
      packet.data.localEvent = false
      // @ts-expect-error packet.data is a safe type here
      this.app.emit(packet.name as keyof ApplicationEvents, packet.data)
    })
  }

  public shutdown(): void {
    this.client?.close()
  }
}
