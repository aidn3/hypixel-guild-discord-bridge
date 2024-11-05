import type { Logger } from 'log4js'

type PromiseCatchHandler = (error: unknown) => void
export default class UnexpectedErrorHandler {
  private readonly logger: Logger

  public constructor(logger: Logger) {
    this.logger = logger
  }

  public promiseCatch(handlerName: string): PromiseCatchHandler {
    return (error) => {
      this.logger.error(`Unexpected error: ${handlerName}`, error)
    }
  }
}
