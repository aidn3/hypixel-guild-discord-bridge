import assert from 'node:assert'

export class Timeout<T> {
  private timedOut = false
  private readonly promise: Promise<T | undefined>
  private resolveFunction: (argument: T) => void

  constructor(public readonly milliseconds: number) {
    this.promise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(undefined)
      }, milliseconds)

      this.resolveFunction = (argument: T) => {
        clearTimeout(timeout)
        resolve(argument)
      }
    })

    // @ts-expect-error Promise is executed before the constructor is returned
    assert(this.resolveFunction)
  }

  public resolve(argument: T): void {
    this.resolveFunction(argument)
  }

  public async wait(): Promise<T | undefined> {
    return await this.promise
  }
}
