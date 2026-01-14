import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color, PunishmentPurpose } from '../../../common/application-event'
import type { User } from '../../../common/user'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import Duration from '../../../utility/duration'
import { Timeout } from '../../../utility/timeout'
import { SpontaneousEventHandler } from '../common'

export class CountingChain extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.CountingChain)
  }

  override async startEvent(): Promise<void> {
    const timeout = new Timeout<ChatEvent>(10_000)
    let beforeLast: User | undefined
    let lastUser: User | undefined
    let currentCount = 0

    const listener = async (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return
      const sameAsLastUser = lastUser !== undefined && event.user.equalsUser(lastUser)

      const match = /^[\s!@#$%^&*()_+\-=`~?>|\\\][{}]*(\d+)(?:\s.*|)$/g.exec(event.message)
      if (!match) return

      const nextPossibleCount = Number.parseInt(match[1], 10)
      if (nextPossibleCount === currentCount + 1) {
        if (sameAsLastUser) return

        timeout.refresh()
        currentCount = nextPossibleCount
        beforeLast = lastUser
        lastUser = event.user

        this.logger.debug(`Counting chain reached ${currentCount}`)
        if (/^10+$/g.test(currentCount.toString(10))) {
          await this.broadcastMessage(`Reached ${currentCount.toLocaleString('en-US')} counting chain!`, Color.Good)
          timeout.refresh()
        }
      } else if (nextPossibleCount <= currentCount && lastUser !== undefined) {
        timeout.refresh()
        await this.broadcastMessage(`Last Reached number is ${currentCount} by ${lastUser.displayName()}!`, Color.Info)
        timeout.refresh()
      }
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Start counting chain from 1 to infinity!`, Color.Good)
    timeout.refresh()

    await timeout.wait()
    this.application.off('chat', listener)

    if (beforeLast === undefined) {
      await this.broadcastMessage(`Never mind the counting chain :(`, Color.Info)
    } else {
      await this.broadcastMessage(
        `${beforeLast.displayName()} was the 2nd to last to stop counting. How dare you!`,
        Color.Good
      )
      await beforeLast.mute(
        this.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Duration.minutes(5),
        'Did not continue chain counting'
      )
    }
  }
}
