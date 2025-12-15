import type { InstanceMessage, InstanceStatus, InstanceType } from './application-event.js'
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
   */
  public async setAndBroadcastNewStatus(status: Status): Promise<void> {
    if (this.status === status) return
    const oldStatus = this.status
    this.status = status

    const event = {
      ...this.eventHelper.fillBaseEvent(),

      status: { from: oldStatus, to: status },
      message: undefined
    } satisfies InstanceStatus
    await this.broadcastStatusEvent(event)
  }

  public async setAndBroadcastNewStatusWithMessage(
    status: Exclude<Status, Status.Connected>,
    message: InstanceMessage
  ): Promise<void> {
    if (this.status === status) return
    const oldStatus = this.status
    this.status = status

    const event = {
      ...this.eventHelper.fillBaseEvent(),

      status: { from: oldStatus, to: status },
      message: message
    } satisfies InstanceStatus
    await this.broadcastStatusEvent(event)
  }

  public async broadcastInstanceMessage(message: InstanceMessage): Promise<void> {
    const event = {
      ...this.eventHelper.fillBaseEvent(),

      status: undefined,
      message: message
    } satisfies InstanceStatus

    await this.broadcastStatusEvent(event)
  }

  private async broadcastStatusEvent(event: InstanceStatus): Promise<void> {
    // Directly add the entry into the database before broadcasting it,
    // so listeners can query database for entire history directly after
    // without worry if they ever wish to
    this.application.core.statusHistory.add(event)

    await this.application.emit('instanceStatus', event)
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
