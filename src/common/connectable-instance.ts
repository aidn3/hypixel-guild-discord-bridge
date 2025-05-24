import type Application from '../application.js'

import type { InstanceStatusEvent, InstanceType } from './application-event.js'
import { InstanceSignalType } from './application-event.js'
import { Instance } from './instance.js'

export abstract class ConnectableInstance<T extends InstanceType> extends Instance<T> {
  private status: Status = Status.Fresh

  protected constructor(app: Application, instanceName: string, instanceType: T) {
    super(app, instanceName, instanceType)

    this.application.on('instanceSignal', (event) => {
      if (event.targetInstanceName.includes(this.instanceName)) {
        this.logger.log(`instance has received signal type=${event.type}`)

        if (event.type === InstanceSignalType.Restart) {
          const promise = this.connect()
          if (promise !== undefined && 'then' in promise) {
            promise.catch(this.errorHandler.promiseCatch('handling instanceSignal'))
          }
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (event.type === InstanceSignalType.Shutdown) {
          const promise = this.disconnect()
          if (promise !== undefined && 'then' in promise) {
            promise.catch(this.errorHandler.promiseCatch('handling instanceSignal'))
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`unknown instanceSignal type=${event.type}`)
        }
      }
    })
  }

  public currentStatus(): Status {
    return this.status
  }

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
    this.application.emit('instanceStatus', {
      ...this.eventHelper.fillBaseEvent(),

      status: status,
      message: reason
    } satisfies InstanceStatusEvent)
  }

  /**
   * Called when trying to connect, reconnect or reset the connection
   * The call can either be manual or automatic.
   *
   * Make sure the inner client can be completely disposed of,
   * since many listeners will listen to every connection.
   * Not disposing of the old client may result in double listeners.
   */
  public abstract connect(): Promise<void> | void

  /**
   * Called when disconnecting either for good or temporarily.
   * The call can either be manual or automatic.
   *
   * Make sure the inner client can be completely disposed of,
   * since many listeners will listen to every connection.
   * Not disposing of the old client may result in double listeners.
   */
  public abstract disconnect(): Promise<void> | void
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
