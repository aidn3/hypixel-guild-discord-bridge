import type { Logger } from 'log4js'

import type Application from '../../application'
import type { Color, InstanceType } from '../../common/application-event'
import { ChannelType } from '../../common/application-event'
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'

import type { SpontaneousEvents } from './spontaneous-events'

export abstract class SpontaneousEventHandler extends SubInstance<SpontaneousEvents, InstanceType.Utility, void> {
  override registerEvents() {
    // do nothing
  }

  public abstract enabled(): boolean

  protected async broadcastMessage(message: string, color: Color): Promise<void> {
    await this.application.emit('broadcast', {
      ...this.eventHelper.fillBaseEvent(),

      channels: [ChannelType.Public],
      color: color,

      user: undefined,
      message: message
    })
  }

  abstract startEvent(): Promise<void>
}

export interface EventContext {
  logger: Logger
  application: Application
  eventHelper: EventHelper<InstanceType>
  broadcastMessage: (message: string, color: Color) => Promise<void>
}

// https://stackoverflow.com/a/2450976
export function shuffleArrayInPlace<T>(array: T[]): T[] {
  let currentIndex = array.length

  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}
