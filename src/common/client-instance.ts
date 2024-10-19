import type { Logger } from 'log4js'
import Logger4js from 'log4js'

import type Application from '../application.js'

import type { InstanceType } from './application-event.js'

export abstract class ClientInstance<K> {
  readonly instanceName: string
  readonly instanceType: InstanceType
  readonly app: Application
  readonly logger: Logger
  readonly config: K

  status: Status

  protected constructor(app: Application, instanceName: string, instanceType: InstanceType, config: K) {
    this.app = app
    this.instanceName = instanceName
    this.instanceType = instanceType
    // eslint-disable-next-line import/no-named-as-default-member
    this.logger = Logger4js.getLogger(instanceName)
    this.config = config
    this.status = Status.Fresh
  }

  /**
   * Called when trying to connect, reconnect or reset the connection
   * The call can either be manual or automatic.
   *
   * Make sure the inner client can be completely disposed of,
   * since many listeners will listen to every connection.
   * Not disposing of the old client may result in double listeners.
   */
  abstract connect(): Promise<void> | void
}

export enum Status {
  /**
   * Freshly created instance
   */
  Fresh = 'fresh',
  /**
   * Instance is connecting for first time
   */
  Connecting = 'connecting',
  /**
   * Instance is trying to connect with its own private client
   */
  Connected = 'connected',
  /**
   * Instance has decided to shut down for a critical reason
   */
  Failed = 'failed'
}

export const InternalInstancePrefix = 'internal/'
