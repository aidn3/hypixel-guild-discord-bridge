import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { Color } from '../../common/application-event.js'
import { ChannelType } from '../../common/application-event.js'
import type EventHelper from '../../common/event-helper.js'
import type { Instance } from '../../common/instance.js'
import SubInstance from '../../common/sub-instance.js'
import type { User } from '../../common/user.js'

import type { SpontaneousEvents } from './spontaneous-events.js'

export abstract class SpontaneousEventHandler extends SubInstance<SpontaneousEvents, void> {
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

  abstract startEvent(): Promise<EventResult>
}

export type EventResult = { type: 'win'; user: User } | { type: 'ended' }

export interface EventContext {
  logger: Logger
  application: Application
  eventHelper: EventHelper<Instance>
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
