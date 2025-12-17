import PromiseQueue from 'promise-queue'

import type { PromiseCatchHandler } from '../common/unexpected-error-handler'

import type Duration from './duration'

export interface ScheduleOptions {
  errorHandler: PromiseCatchHandler
  abortSignal?: AbortSignal
}

export function setIntervalAsync(
  callback: () => Promise<unknown>,
  options: ScheduleOptions & { delay: Duration }
): NodeJS.Timeout {
  const queue = new PromiseQueue(1)

  return setInterval(() => {
    const totalQueue = queue.getPendingLength() + queue.getQueueLength()
    if (totalQueue === 0) {
      void queue.add(() => callback()).catch(options.errorHandler)
    }
  }, options.delay.toMilliseconds())
}

export function setTimeoutAsync(
  callback: () => Promise<unknown>,
  options: ScheduleOptions & { delay: Duration }
): NodeJS.Timeout {
  const queue = new PromiseQueue(1)

  return setTimeout(() => {
    // allow to queue as many as possible if refresh() is used
    void queue.add(() => callback()).catch(options.errorHandler)
  }, options.delay.toMilliseconds())
}
