import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type Application from '../../application'
import { ChannelType, type ChatEvent, InstanceType } from '../../common/application-event'
import { Instance } from '../../common/instance'
import type { User } from '../../common/user'

import type { SpontaneousEventHandler } from './common'
import { shuffleArrayInPlace } from './common'
import { CountingChain } from './events/counting-chain'
import { QuickMath } from './events/quick-math'
import { Trivia } from './events/trivia'
import { Unscramble } from './events/unscramble'

export class SpontaneousEvents extends Instance<InstanceType.Utility> {
  private readonly registeredEventHandlers: SpontaneousEventHandler[] = []
  private readonly singletonPromise = new PromiseQueue(1)

  private lastEventAt = -1
  private lastEventType: SpontaneousEventHandler | undefined

  private chatHeat: { user: User; timestamp: number }[] = []

  constructor(application: Application) {
    super(application, 'spontaneous-events', InstanceType.Utility)

    this.application.on('chat', async (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return
      await this.singletonPromise.add(() => this.handlePublicChatEvent(event.user, event.createdAt))
    })

    this.registerEvent(new QuickMath(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new CountingChain(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new Unscramble(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new Trivia(this.application, this, this.eventHelper, this.logger, this.errorHandler))
  }

  public registerEvent(handler: SpontaneousEventHandler): void {
    assert.ok(!this.registeredEventHandlers.includes(handler))
    this.registeredEventHandlers.push(handler)
  }

  private async handlePublicChatEvent(user: User, eventCreatedAt: number): Promise<void> {
    const config = this.application.core.spontaneousEventsConfigurations
    const activityDuration = config.getActivityDuration()
    const minimumMessages = config.getMinimumMessages()
    const cooldownDuration = config.getCooldownDuration()
    const minimumUsers = config.getMinimumUsers()

    this.chatHeat.push({ user: user, timestamp: eventCreatedAt })
    this.chatHeat = this.chatHeat.filter(
      (entry) => entry.timestamp + activityDuration.toMilliseconds() > eventCreatedAt
    )

    if (this.chatHeat.length < minimumMessages) return
    if (this.lastEventAt + cooldownDuration.toMilliseconds() > eventCreatedAt) return

    const uniqueUsers: User[] = []
    for (const entry of this.chatHeat) {
      let userExists = false

      for (const countedUser of uniqueUsers) {
        if (countedUser.equalsUser(entry.user)) {
          userExists = true
        }
      }

      if (!userExists) uniqueUsers.push(user)
    }
    if (uniqueUsers.length < minimumUsers) return

    if (!this.application.core.spontaneousEventsConfigurations.getEnabled()) {
      return undefined
    }

    const spontaneousEventHandler = this.pickRandomEvent()
    if (spontaneousEventHandler === undefined) return

    await spontaneousEventHandler.startEvent().finally(() => {
      this.lastEventAt = Date.now()
      this.lastEventType = spontaneousEventHandler
    })
  }

  private pickRandomEvent(): SpontaneousEventHandler | undefined {
    const enabledHandlers = this.registeredEventHandlers.filter((handler) => handler.enabled())
    if (enabledHandlers.length === 0) return undefined

    let preferredHandlers = enabledHandlers.filter((handler) => handler !== this.lastEventType)
    if (preferredHandlers.length === 0) {
      if (enabledHandlers.length > 0) {
        preferredHandlers = enabledHandlers
      } else {
        return undefined
      }
    }

    shuffleArrayInPlace(preferredHandlers)
    return preferredHandlers[Math.floor(Math.random() * preferredHandlers.length)]
  }
}
