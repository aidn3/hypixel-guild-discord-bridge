import assert from 'node:assert'
import type { IncomingMessage, Server } from 'node:http'
import { createServer } from 'node:http'
import type { Duplex } from 'node:stream'

import { HttpStatusCode } from 'axios'
import type { Logger } from 'log4js'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import type Application from '../../application.js'
import type { InstanceIdentifier } from '../../common/application-event.js'

import type { ApplicationPacket, SocketConnectionInfo, SocketPacket } from './common.js'
import {
  AuthenticationHeader,
  InstancesHeader,
  InternalInstances,
  SocketConnectionInfoPacketName,
  SocketIdHeader
} from './common.js'

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

    app.on('all', (name, event) => {
      if (!event.localEvent) return
      if (InternalInstances.includes(event.instanceType)) return

      for (const client of this.socketServer.clients) {
        client.send(
          JSON.stringify({
            name: name,
            data: event
          } satisfies ApplicationPacket)
        )
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

    try {
      const socketIdHeader = request.headers[SocketIdHeader]
      assert(typeof socketIdHeader === 'string')
      const socketId = Number.parseInt(socketIdHeader, 10)

      const instancesHeader = request.headers[InstancesHeader]
      assert(typeof instancesHeader === 'string')
      const instanceIdentifiers = JSON.parse(instancesHeader) as InstanceIdentifier[]

      const newSocketId = this.app.applicationIntegrity.addRemoteApplication(socketId, instanceIdentifiers)

      this.socketServer.handleUpgrade(request, socket, head, (ws) => {
        this.socketServer.emit('connection', ws, request)
        ws.send(
          JSON.stringify({
            name: SocketConnectionInfoPacketName,
            data: { socketId: newSocketId } satisfies SocketConnectionInfo
          } satisfies SocketPacket)
        )
      })
    } catch (error: unknown) {
      this.logger.error(
        error,
        'Socket Server has received an authorized connection request but failed to properly parse it'
      )

      socket.write('HTTP/1.1 409 Conflict\r\n\r\n')
      socket.destroy()
    }
  }

  private handleConnection(socket: WebSocket): void {
    socket.on('error', (error) => {
      this.logger.error(error)
    })

    this.logger.debug('New Socket connection.')
    this.app.syncBroadcast()

    socket.on('message', (rawData) => {
      const packet = JSON.parse(rawData as unknown as string) as ApplicationPacket
      packet.data.localEvent = false

      if (InternalInstances.includes(packet.data.instanceType)) {
        this.logger.error(
          `Socket client has sent an event with instanceType=${packet.data.instanceType}.` +
            ` dropping it and closing the connection since it is considered an internal type.`
        )
        socket.close(HttpStatusCode.NotAcceptable, `instanceType=${packet.data.instanceType} not acceptable`)
        return
      }

      try {
        this.app.emit(packet.name, packet.data)
      } catch (error: unknown) {
        this.logger.error(
          error,
          'A socket event has resulted in an error when being emitted to the application. Dropping the socket connection'
        )
        socket.close(HttpStatusCode.InternalServerError, 'invalid event data')
        return
      }

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
