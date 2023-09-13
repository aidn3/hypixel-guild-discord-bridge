import { io, Socket } from 'socket.io-client'
import Application from '../../Application'
import { BaseEvent } from '../../common/ApplicationEvent'
import { Logger } from 'log4js'

export default class ClientSocket {
  private readonly client: Socket

  constructor(app: Application, logger: Logger, uri: string, key: string) {
    this.client = io(uri, {
      transports: ['websocket'],
      auth: { key }
    })

    this.client.onAny((name, ...args) => {
      const event: BaseEvent = args[0]
      event.localEvent = false
      app.emit(name, ...args)
    })
    app.on('*', (name, ...args) => {
      const event: BaseEvent = args[0]
      if (event.localEvent) {
        this.client.emit(name, ...args)
      }
    })
    this.client.on('connect', () => {
      logger.debug('Client socket connected.')
      app.broadcastLocalInstances()
    })
    this.client.on('connect_error', (err) => {
      logger.error('Socket Client encountered an error while connecting to server.')
      logger.error(err)
    })
    this.client.on('disconnect', (reason) => {
      logger.warn(`Socket Client has disconnected: ${reason}`)
    })
  }

  public shutdown(): void {
    this.client.close()
  }
}
