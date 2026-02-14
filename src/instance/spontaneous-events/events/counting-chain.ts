import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color, Permission, PunishmentPurpose } from '../../../common/application-event'
import type { User } from '../../../common/user'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import Duration from '../../../utility/duration'
import { Timeout } from '../../../utility/timeout'
import type { EventContext } from '../common'
import { SpontaneousEventHandler } from '../common'

export class CountingChain extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.CountingChain)
  }

  override async startEvent(): Promise<void> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const result = await startCountingChain(context, Duration.seconds(10))
    await context.broadcastMessage(result.message, result.color)
  }
}

export async function startCountingChain(
  context: EventContext,
  time: Duration
): Promise<{ message: string; color: Color }> {
  const timeout = new Timeout<ChatEvent>(time.toMilliseconds())
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

      context.logger.debug(`Counting chain reached ${currentCount}`)
      if (/^10+$/g.test(currentCount.toString(10))) {
        await context.broadcastMessage(`Reached ${currentCount.toLocaleString('en-US')} counting chain!`, Color.Good)
        timeout.refresh()
      }
    } else if (nextPossibleCount <= currentCount && lastUser !== undefined) {
      timeout.refresh()
      await context.broadcastMessage(`Last Reached number is ${currentCount} by ${lastUser.displayName()}!`, Color.Info)
      timeout.refresh()
    }
  }

  context.application.on('chat', listener)
  await context.broadcastMessage(`Start counting chain from 1 to infinity!`, Color.Good)
  timeout.refresh()

  await timeout.wait()
  context.application.off('chat', listener)

  if (beforeLast === undefined) {
    return { message: `Never mind the counting chain :(`, color: Color.Info }
  } else {
    if (beforeLast.permission() < Permission.Helper && !beforeLast.immune()) {
      await beforeLast.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Duration.minutes(5),
        'Did not continue chain counting'
      )
    }

    return {
      message: `${beforeLast.displayName()} was the 2nd to last to stop counting. How dare you!`,
      color: Color.Good
    }
  }
}
