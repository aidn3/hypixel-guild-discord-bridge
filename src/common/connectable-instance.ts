import type { InstanceStatusEvent, InstanceType } from './application-event.js'
import { Instance } from './instance.js'

export abstract class ConnectableInstance<K, T extends InstanceType> extends Instance<K, T> {
  private status: Status = Status.Fresh

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
