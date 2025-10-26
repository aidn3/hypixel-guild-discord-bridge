import type { InstanceStatusEvent, InstanceType } from './application-event.js'
import { InstanceSignalType } from './application-event.js'
import { Instance } from './instance.js'

export abstract class ConnectableInstance<T extends InstanceType> extends Instance<T> {
  private status: Status = Status.Fresh

  public async signal(type: InstanceSignalType): Promise<void> {
    this.logger.log(`instance has received signal type=${type}`)

    if (type === InstanceSignalType.Restart) {
      await this.connect()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (type === InstanceSignalType.Shutdown) {
      await this.disconnect()
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`unknown instanceSignal type=${type}`)
    }
  }

  public currentStatus(): Status {
    return this.status
  }

  /**
   * Change instance status and inform other instances about the status.
   * Function will just return if the status is the same.
   * @param status The status to set
   * @param reason Any message to supply for other instances in case of displaying a human-readable message.
   * @param visibility whether to broadcast the status change and how to broadcast it
   */
  public setAndBroadcastNewStatus(
    status: Status,
    reason: string,
    visibility: StatusVisibility = StatusVisibility.Show
  ): void {
    if (this.status === status) return
    this.status = status
    if (visibility === StatusVisibility.Hidden) return
    this.application.emit('instanceStatus', {
      ...this.eventHelper.fillBaseEvent(),

      status: status,
      visibility: visibility,

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

export enum StatusVisibility {
  /**
   * Broadcast the status and instruct all instances to display it everywhere
   */
  Show = 'show',
  /**
   * Broadcast the status and instruct all instances to process them but not display anything
   */
  Silent = 'silent',
  /**
   * Do not broadcast the event anywhere
   */
  Hidden = 'hidden'
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
