import { getLogger, Logger } from 'log4js'
import Application from '../Application'

export abstract class ClientInstance<K> {
  readonly instanceName: string
  readonly location: LOCATION
  readonly app: Application
  readonly logger: Logger
  readonly config: K

  status: Status

  protected constructor(app: Application, instanceName: string, location: LOCATION, config: K) {
    this.app = app
    this.instanceName = instanceName
    this.location = location
    this.logger = getLogger(instanceName)
    this.config = config
    this.status = Status.FRESH
  }

  abstract connect(): Promise<void>
}

export enum Status {
  /**
   * Freshly created instance
   */
  FRESH,
  /**
   * Instance is connecting for first time
   */
  CONNECTING,
  /**
   * Instance is trying to connect with its own private client
   */
  CONNECTED,
  /**
   * Instance has decided to shut down for a critical reason
   */
  FAILED
}

export enum LOCATION {
  MAIN = 'main',
  METRICS = 'metrics',
  SOCKET = 'socket',

  DISCORD = 'discord',
  MINECRAFT = 'minecraft',
  WEBHOOK = 'webhook',
  GLOBAL = 'global'
}

export enum SCOPE {
  OFFICER = 'officer',
  PUBLIC = 'public',
  PRIVATE = 'private'
}
