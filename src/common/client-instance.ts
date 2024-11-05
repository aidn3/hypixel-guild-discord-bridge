import type { Logger } from 'log4js'
import Logger4js from 'log4js'

import type Application from '../application.js'

import type { InstanceStatusEvent, InstanceType } from './application-event.js'
import UnexpectedErrorHandler from './unexpected-error-handler.js'

export abstract class ClientInstance<K> {
  public readonly instanceName: string
  public readonly instanceType: InstanceType

  protected readonly app: Application
  protected readonly logger: Logger
  protected readonly config: K
  protected readonly errorHandler: UnexpectedErrorHandler

  private status: Status

  protected constructor(app: Application, instanceName: string, instanceType: InstanceType, config: K) {
    this.app = app
    this.instanceName = instanceName
    this.instanceType = instanceType
    // eslint-disable-next-line import/no-named-as-default-member
    this.logger = Logger4js.getLogger(instanceName)
    this.config = config
    this.status = Status.Fresh
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
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

  /**
   * Change instance status and inform other instances about the status.
   * Function will just return if the status is the same.
   *
   * @param status The status to set
   * @param reason Any message to supply for other instances in case of displaying a human-readable message.
   * @protected
   */
  public setAndBroadcastNewStatus(status: Status, reason: string): void {
    if (this.status === status) return
    this.status = status
    this.app.emit('instanceStatus', {
      localEvent: true,
      instanceName: this.instanceName,
      instanceType: this.instanceType,
      status: status,
      message: reason
    } satisfies InstanceStatusEvent)
  }

  public currentStatus(): Status {
    return this.status
  }
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
   * When an instance is temporarily disconnected
   */
  Disconnected = 'disconnected',
  /**
   * When an instance has gracefully ended
   */
  Ended = 'ended',

  /**
   * Instance has decided to shut down for a critical reason.
   * This means the instance won't retry to reconnect.
   */
  Failed = 'failed'
}

export const InternalInstancePrefix = 'internal/'
