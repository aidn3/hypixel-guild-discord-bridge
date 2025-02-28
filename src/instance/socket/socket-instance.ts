import type { SocketConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance } from '../../common/client-instance.js'

import ClientSocket from './client-socket.js'
import ServerSocket from './server-socket.js'

export default class SocketInstance extends ClientInstance<SocketConfig, InstanceType.Socket> {
  private serverSocket: ServerSocket | undefined
  private clientSocket: ClientSocket | undefined

  constructor(app: Application, instanceName: string, socketConfig: SocketConfig) {
    super(app, instanceName, InstanceType.Socket, socketConfig)
  }

  connect(): void {
    if (this.serverSocket != undefined) {
      this.logger.trace('Socket Server exists. Shutting it down...')
      this.serverSocket.shutdown()
    }
    if (this.clientSocket != undefined) {
      this.logger.trace('Socket Client exists. Shutting it down...')
      this.clientSocket.shutdown()
    }

    if (this.config.type === 'server') {
      this.logger.debug(`Creating socket Server on port ${this.config.port}...`)
      this.serverSocket = new ServerSocket(this.application, this.logger, this.config.port, this.config.key)
    } else {
      this.logger.debug(`Creating socket Client and connecting to ${this.config.uri}...`)
      this.clientSocket = new ClientSocket(this.application, this.logger, this.config.uri, this.config.key)
    }
  }
}
