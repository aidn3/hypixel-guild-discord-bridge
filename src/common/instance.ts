import type { Logger } from 'log4js'
import Logger4js from 'log4js'

import type Application from '../application.js'

import type { InstanceIdentifier, InstanceType } from './application-event.js'
import EventHelper from './event-helper.js'
import UnexpectedErrorHandler from './unexpected-error-handler.js'

export abstract class Instance<K, T extends InstanceType> implements InstanceIdentifier {
  public readonly instanceName: string
  public readonly instanceType: T

  protected readonly application: Application
  protected readonly logger: Logger
  protected readonly config: K
  protected readonly errorHandler: UnexpectedErrorHandler
  protected readonly eventHelper: EventHelper<T>

  protected constructor(application: Application, instanceName: string, instanceType: T, config: K) {
    this.application = application
    this.instanceName = instanceName
    this.instanceType = instanceType

    // eslint-disable-next-line import/no-named-as-default-member
    this.logger = Logger4js.getLogger(instanceName)
    this.config = config
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
    this.eventHelper = new EventHelper<T>(this.instanceName, this.instanceType)
  }

  public announceExistence(): void {
    this.application.emit('instanceAnnouncement', {
      ...this.eventHelper.fillBaseEvent()
    })
  }
}

export const InternalInstancePrefix = 'internal/'
