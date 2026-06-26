import type { Logger } from 'log4js'

import type Application from '../application.js'

import type { ConnectableInstance } from './connectable-instance.js'
import type EventHelper from './event-helper.js'
import type { Instance } from './instance.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

export default abstract class SubInstance<K extends ConnectableInstance | Instance, O> {
  public constructor(
    protected readonly application: Application,
    protected readonly clientInstance: K,
    protected readonly eventHelper: EventHelper<K>,
    protected readonly logger: Logger,
    protected readonly errorHandler: UnexpectedErrorHandler,
    protected readonly abortSignal: AbortSignal
  ) {}

  /**
   * Called every time the client reconnects.
   *
   * NOTE: Do not register events that listen on global events.
   * This function will be called multiple times with every reconstruct of the instance.
   * Use constructors functions if you want to register an event once
   * @param option the volatile object that is used to register the event-handler with when the function is called
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public registerEvents(option: O): void {
    // optional to implement
  }
}
