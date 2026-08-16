import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type { ChatEvent } from '../../common/application-event.js'
import { ChannelType } from '../../common/application-event.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { AnonymousUser } from '../../common/user.js'
import Duration from '../../utility/duration.js'

import { EconomyChat } from './economy-constants.js'
import type { EconomyDatabase } from './economy-database.js'
import type { Economy } from './economy.js'

export class ChatCounter extends SubInstance<Economy, void> {
  private readonly lastRewards = new Map<AnonymousUser, number>()
  private readonly lastTalked = new Map<AnonymousUser, number>()

  constructor(
    application: Application,
    instance: Economy,
    eventHelper: EventHelper<Economy>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal,
    private readonly database: EconomyDatabase
  ) {
    super(application, instance, eventHelper, logger, errorHandler, abortSignal)

    this.application.on('chat', (event) => {
      this.onChat(event)
    })

    const cleaningInterval = setInterval(() => {
      this.clean()
    }, Duration.minutes(5).toMilliseconds())
    cleaningInterval.unref()
    this.abortSignal.addEventListener('abort', () => {
      cleaningInterval.close()
    })
  }

  private clean(): void {
    const currentTime = Date.now()
    const earliestDate = currentTime - EconomyChat.cooldown.toMilliseconds()

    for (const [user, createdAt] of this.lastRewards.entries()) {
      if (createdAt < earliestDate) this.lastRewards.delete(user)
    }
    for (const [user, createdAt] of this.lastTalked.entries()) {
      if (createdAt < earliestDate) this.lastTalked.delete(user)
    }
  }

  private onChat(event: ChatEvent): void {
    if (event.channelType !== ChannelType.Public) return

    const currentTime = Date.now()
    const oldestTime = currentTime - EconomyChat.cooldown.toMilliseconds()
    this.lastTalked.set(event.user, currentTime)

    const otherUsers = this.someoneElseTalked(oldestTime, event.user)
    if (otherUsers.length < EconomyChat.usersCountRestriction) return

    const alreadyRewardedUsers = this.lastRewards
      .entries()
      .filter(([, rewardedAt]) => rewardedAt >= oldestTime)
      .map(([user]) => user)
      .toArray()

    for (const { user: userToReward, sentAt } of [...otherUsers, { user: event.user, sentAt: event.createdAt }]) {
      if (alreadyRewardedUsers.some((alreadyRewardedUser) => alreadyRewardedUser.equalsUser(userToReward))) continue
      this.database.increaseChat(userToReward, EconomyChat.amount)
      this.lastRewards.set(userToReward, sentAt)
    }
  }

  private someoneElseTalked(oldestTime: number, currentUser: AnonymousUser): { user: AnonymousUser; sentAt: number }[] {
    const result: { user: AnonymousUser; sentAt: number }[] = []

    const entries = this.lastTalked
      .entries()
      .toArray()
      .toSorted(([, sentAt1], [, sentAt2]) => sentAt2 - sentAt1) // earliest to oldest

    for (const [user, sentAt] of entries) {
      if (sentAt < oldestTime) {
        this.lastTalked.delete(user)
        continue
      }

      if (result.some((userEntry) => userEntry.user.equalsUser(user) || userEntry.user === user)) continue
      if (user === currentUser || user.equalsUser(currentUser)) continue
      result.push({ user, sentAt })
    }

    return result
  }
}
