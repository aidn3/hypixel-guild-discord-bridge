import assert from 'node:assert'

export class Timeout<T> {
  private readonly defaultValue: T | undefined
  private hasFinished = false
  private hasTimedOut = false
  private readonly promise: Promise<T | undefined>
  private resolveFunction: (argument: T) => void

  constructor(
    public readonly milliseconds: number,
    defaultValue?: T
  ) {
    this.defaultValue = defaultValue
    this.promise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.hasFinished = true
        this.hasTimedOut = true
        resolve(this.defaultValue)
      }, milliseconds)

      this.resolveFunction = (argument: T) => {
        clearTimeout(timeout)
        this.hasFinished = true
        resolve(argument)
      }
    })

    // @ts-expect-error Promise is executed before the constructor is returned
    assert.ok(this.resolveFunction)
  }

  public finished(): boolean {
    return this.hasFinished
  }

  public timedOut(): boolean {
    return this.hasTimedOut
  }

  public resolve(argument: T): void {
    this.resolveFunction(argument)
  }

  public async wait(): Promise<T | undefined> {
    return await this.promise
  }
}
