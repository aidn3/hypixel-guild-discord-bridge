import type { IncomingMessage, Server } from 'node:http'
import { createServer } from 'node:http'
import type { Duplex } from 'node:stream'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import type { Logger } from 'log4js'

import type Application from '../../Application'
import type { ApplicationEvents } from '../../Application'
import type { WebsocketPacket } from './common'
import { AuthenticationHeader } from './common'

export default class ServerSocket {
  private readonly app: Application
  private readonly logger
  private readonly key: string

  private readonly socketServer: WebSocketServer
  private readonly httpServer: Server

  constructor(app: Application, logger: Logger, port: number, key: string) {
    this.app = app
    this.logger = logger
    this.key = key

    this.socketServer = new WebSocketServer({ noServer: true })
    this.socketServer.on('connection', (socket) => {
      this.handleConnection(socket)
    })

    this.httpServer = createServer()
    this.httpServer.on('upgrade', (request, socket, head) => {
      this.handleConnection1(request, socket, head)
    })
    this.httpServer.listen(port)

    app.on('*', (name, event) => {
      if (event.localEvent) {
        for (const client of this.socketServer.clients) {
          client.send(
            JSON.stringify({
              name: name,
              data: event
            } satisfies WebsocketPacket)
          )
        }
      }
    })
  }

  private handleConnection1(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (request.headers[AuthenticationHeader] !== this.key) {
      this.logger.warn('Socket Server has received' + ` an unauthorized connection request`)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    this.socketServer.handleUpgrade(request, socket, head, (ws) => {
      this.socketServer.emit('connection', ws, request)
    })
  }

  private handleConnection(socket: WebSocket): void {
    socket.on('error', (error) => {
      this.logger.error(error)
    })

    this.logger.debug('New Socket connection.')
    this.app.syncBroadcast()

    socket.on('message', (rawData) => {
      const packet = JSON.parse(rawData as unknown as string) as WebsocketPacket
      packet.data.localEvent = false
      // @ts-expect-error packet.data is a safe type here
      this.app.emit(packet.name as keyof ApplicationEvents, packet.data)

      for (const clientEntry of this.socketServer.clients) {
        if (clientEntry !== socket) clientEntry.send(rawData)
      }
    })
  }

  public shutdown(): void {
    this.httpServer.close()
    this.socketServer.close()
  }
}
