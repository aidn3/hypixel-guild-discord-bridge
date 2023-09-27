import { Server, Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import { Logger } from 'log4js'
import Application from '../../Application'
import { BaseEvent } from '../../common/ApplicationEvent'

export default class ServerSocket {
  private readonly server: Server
  private readonly key: string

  constructor(app: Application, logger: Logger, port: number, key: string) {
    this.key = key
    this.server = new Server({ transports: ['websocket'] })
    this.server.listen(port)
    this.server.use((socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
      if (socket.handshake.auth.key === this.key) {
        next()
        return
      }

      logger.warn('Socket Server has received' + ` an authorized connection request from socket ${socket.id}.`)
      next(new Error('invalid key'))
    })

    app.on('*', (name, ...args) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const event: BaseEvent = args[0] as BaseEvent
      if (event.localEvent) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.server.emit(name, ...args)
      }
    })

    this.server.on('connection', (socket) => {
      logger.debug('New Socket connection.')
      app.broadcastLocalInstances()

      socket.onAny((name, ...args) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const event: BaseEvent = args[0]
        event.localEvent = false
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        app.emit(name, ...args)

        for (const [id, s] of this.server.sockets.sockets.entries()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          if (id !== socket.id) s.emit(name, ...args)
        }
      })
    })
  }

  public shutdown(): void {
    this.server.close()
  }
}
