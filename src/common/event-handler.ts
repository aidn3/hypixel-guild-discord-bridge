import type { Logger } from 'log4js'

import type Application from '../application.js'

import type { InstanceType } from './application-event.js'
import type { ConnectableInstance } from './connectable-instance.js'
import type EventHelper from './event-helper.js'
import type { Instance } from './instance.js'
import type UnexpectedErrorHandler from './unexpected-error-handler.js'

export default abstract class EventHandler<
  K extends ConnectableInstance<unknown, T> | Instance<unknown, T>,
  T extends InstanceType
> {
  protected application: Application
  protected clientInstance: K
  protected eventHelper: EventHelper<T>
  protected logger: Logger
  protected errorHandler: UnexpectedErrorHandler

  public constructor(
    application: Application,
    clientInstance: K,
    eventHelper: EventHelper<T>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    this.application = application
    this.clientInstance = clientInstance
    this.eventHelper = eventHelper
    this.logger = logger
    this.errorHandler = errorHandler
  }

  /**
   * Called every time the client reconnects.
   *
   * NOTE: Do not register events that listen on global events.
   * This function will be called multiple times with every reconstruct of the instance.
   * Use constructors functions if you want to register an event once
   */
  public registerEvents(): void {
    // optional to implement
  }
}
