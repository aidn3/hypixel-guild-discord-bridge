import type { Logger } from 'log4js'
import Logger4Js from 'log4js'

import type Application from '../application.js'

import EventHelper from './event-helper.js'
import UnexpectedErrorHandler from './unexpected-error-handler.js'

export abstract class Instance {
  public readonly instanceId: number

  protected readonly logger: Logger
  protected readonly errorHandler: UnexpectedErrorHandler
  protected readonly eventHelper: EventHelper<this>
  protected readonly abortController = new AbortController()

  protected constructor(
    protected readonly application: Application,
    protected readonly loggerName: string
  ) {
    this.application = application
    this.instanceId = this.application.generateNewInstanceId()

    this.logger = Instance.createLogger(loggerName)
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
    this.eventHelper = new EventHelper<this>(this.instanceId, this)

    this.application.onAny(
      (name, event) => {
        if (event.instance !== this) return
        this.logger.log(`[${name}] ${JSON.stringify(event)}`)
      },
      { signal: this.abortController.signal }
    )
  }

  public getLogName(): string {
    return `name=${this.loggerName},id=${this.instanceId}`
  }

  public static createLogger(name: string): Logger {
    return Logger4Js.getLogger(name)
  }

  public destroy(reason?: string): void {
    this.logger.debug('Destroy signal received: ', reason)
    this.abortController.abort(reason)
  }

  // noinspection JSUnusedGlobalSymbols
  public toJSON(): string {
    return this.loggerName
  }
}

export interface DisplayableInstance {
  displayName(): string | Promise<string>
}
