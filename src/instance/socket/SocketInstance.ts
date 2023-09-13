import { ClientInstance, LOCATION } from '../../common/ClientInstance'
import Application from '../../Application'
import ServerSocket from './ServerSocket'
import ClientSocket from './ClientSocket'
import { SocketConfig, SocketType } from './common/SocketConfig'

export default class SocketInstance extends ClientInstance<SocketConfig> {
  private serverSocket: ServerSocket | undefined
  private clientSocket: ClientSocket | undefined

  constructor(app: Application, instanceName: string, socketConfig: SocketConfig) {
    super(app, instanceName, LOCATION.SOCKET, socketConfig)
  }

  async connect(): Promise<void> {
    if (this.serverSocket != null) {
      this.logger.trace('Socket Server exists. Shutting it down...')
      this.serverSocket.shutdown()
    }
    if (this.clientSocket != null) {
      this.logger.trace('Socket Client exists. Shutting it down...')
      this.clientSocket.shutdown()
    }

    if (this.config.type === SocketType.SERVER) {
      this.logger.debug(`Creating socket Server on port ${this.config.port}...`)
      this.serverSocket = new ServerSocket(this.app, this.logger, this.config.port, this.config.key)
    } else if (this.config.type === SocketType.CLIENT) {
      this.logger.debug(`Creating socket Client and connecting to ${this.config.uri}...`)
      this.clientSocket = new ClientSocket(this.app, this.logger, this.config.uri, this.config.key)
    }
  }
}
