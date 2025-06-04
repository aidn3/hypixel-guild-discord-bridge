import PromiseQueue from 'promise-queue'

import type { InstanceType } from '../../../common/application-event.js'
import { MinecraftSendChatPriority } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import { Timeout } from '../../../util/timeout.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class LimboHandler extends EventHandler<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private static readonly DefaultTimeout = 5 * 60 * 1000
  private static readonly DefaultAcquire = 10 * 60 * 1000

  private queue = new PromiseQueue()

  public async acquire(
    timeout: number = LimboHandler.DefaultTimeout,
    maxAcquire: number = LimboHandler.DefaultAcquire
  ): Promise<Timeout<void>> {
    const queueHandler = new Timeout<Timeout<void>>(timeout)

    void this.queue
      .add(() => {
        if (queueHandler.finished()) return Promise.resolve()

        const acquireHandler = new Timeout<void>(maxAcquire)
        queueHandler.resolve(acquireHandler)

        return acquireHandler.wait()
      })
      .finally(() => {
        if (this.empty()) {
          void this.limbo().catch(this.errorHandler.promiseCatch('handling /limbo command'))
        }
      })
      .catch(this.errorHandler.promiseCatch('queued acquire() LimboHandler'))

    const result = await queueHandler.wait()
    if (result === undefined) throw new Error('Timed out before acquiring the LimboHandler')
    return result
  }

  registerEvents(clientSession: ClientSession): void {
    // first spawn packet
    clientSession.client.on('login', () => {
      if (this.empty()) this.triggerLimbo().catch(this.errorHandler.promiseCatch('handling /limbo command'))
    })
    // change world packet
    clientSession.client.on('respawn', () => {
      if (this.empty()) this.triggerLimbo().catch(this.errorHandler.promiseCatch('handling /limbo command'))
    })
  }

  private empty(): boolean {
    return this.queue.getQueueLength() === 0 && this.queue.getPendingLength() === 0
  }

  private async triggerLimbo(): Promise<void> {
    this.logger.debug(`Spawn event triggered. sending to limbo...`)
    await this.limbo()
  }

  private async limbo(): Promise<void> {
    await this.clientInstance.send('/limbo', MinecraftSendChatPriority.Default, undefined)
  }
}
