import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type Application from '../../application.js'
import { ChannelType, type ChatEvent } from '../../common/application-event.js'
import type { DisplayableInstance } from '../../common/instance.js'
import { Instance } from '../../common/instance.js'
import type { User } from '../../common/user.js'
import { EconomyEventWin } from '../../features/economy/economy-constants.js'
import { EconomyReason } from '../../features/economy/economy-database.js'

import type { SpontaneousEventHandler } from './common.js'
import { shuffleArrayInPlace } from './common.js'
import { CountingChain } from './events/counting-chain.js'
import { QuickMath } from './events/quick-math.js'
import { Trivia } from './events/trivia.js'
import { Unscramble } from './events/unscramble.js'

export class SpontaneousEvents extends Instance implements DisplayableInstance {
  private readonly registeredEventHandlers: SpontaneousEventHandler[] = []
  private readonly singletonPromise = new PromiseQueue(1)

  private lastEventAt = -1
  private lastEventType: SpontaneousEventHandler | undefined

  private chatHeat: { user: User; timestamp: number }[] = []

  constructor(application: Application) {
    super(application, 'spontaneous-events')

    this.application.on('chat', async (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return
      await this.singletonPromise.add(() => this.handlePublicChatEvent(event.user, event.createdAt))
    })

    this.registerEvent(
      new QuickMath(
        this.application,
        this,
        this.eventHelper,
        this.logger,
        this.errorHandler,
        this.abortController.signal
      )
    )
    this.registerEvent(
      new CountingChain(
        this.application,
        this,
        this.eventHelper,
        this.logger,
        this.errorHandler,
        this.abortController.signal
      )
    )
    this.registerEvent(
      new Unscramble(
        this.application,
        this,
        this.eventHelper,
        this.logger,
        this.errorHandler,
        this.abortController.signal
      )
    )
    this.registerEvent(
      new Trivia(this.application, this, this.eventHelper, this.logger, this.errorHandler, this.abortController.signal)
    )
  }

  public displayName(): string {
    return 'Spontaneous Event'
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

    try {
      const result = await spontaneousEventHandler.startEvent()

      if (result.type === 'win') {
        this.application.economy.database.transaction((context) => {
          context
            .getAccount(result.user)
            .increase(EconomyEventWin.amount, { reason: EconomyReason.WonSpontaneousEvent })
        })
      }
    } finally {
      this.lastEventAt = Date.now()
      this.lastEventType = spontaneousEventHandler
    }
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
