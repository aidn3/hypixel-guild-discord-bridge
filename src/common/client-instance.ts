import type { Logger } from 'log4js'
import log4js from 'log4js'

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
    this.logger = log4js.getLogger(instanceName)
    this.config = config
    this.status = Status.FRESH
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
  FRESH = 'FRESH',
  /**
   * Instance is connecting for first time
   */
  CONNECTING = 'CONNECTING',
  /**
   * Instance is trying to connect with its own private client
   */
  CONNECTED = 'CONNECTED',
  /**
   * Instance has decided to shut down for a critical reason
   */
  FAILED = 'FAILED'
}

export const INTERNAL_INSTANCE_PREFIX = 'internal/'
