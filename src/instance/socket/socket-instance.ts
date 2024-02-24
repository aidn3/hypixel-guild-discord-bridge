import { ClientInstance } from '../../common/client-instance'
import type Application from '../../application'
import { InstanceType } from '../../common/application-event'
import type { SocketConfig } from '../../application-config'
import ServerSocket from './server-socket'
import ClientSocket from './client-socket'

export default class SocketInstance extends ClientInstance<SocketConfig> {
  private serverSocket: ServerSocket | undefined
  private clientSocket: ClientSocket | undefined

  constructor(app: Application, instanceName: string, socketConfig: SocketConfig) {
    super(app, instanceName, InstanceType.SOCKET, socketConfig)
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
      this.serverSocket = new ServerSocket(this.app, this.logger, this.config.port, this.config.key)
    } else {
      this.logger.debug(`Creating socket Client and connecting to ${this.config.uri}...`)
      this.clientSocket = new ClientSocket(this.app, this.logger, this.config.uri, this.config.key)
    }
  }
}
