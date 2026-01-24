import type { ConditionHandler, ConditionOption } from './common'
import { InGuild } from './handlers/in-guild'
import { Linked } from './handlers/linked'
import { SkyblockLevel } from './handlers/skyblock-level'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new InGuild())
  }

  public allHandlers(): ConditionHandler<ConditionOption>[] {
    return [...this.handlers.values()]
  }

  public get(id: string): ConditionHandler<ConditionOption> | undefined {
    return this.handlers.get(id)
  }

  public registerHandler(handler: ConditionHandler<ConditionOption>): void {
    const id = handler.getId()
    if (this.handlers.has(id)) {
      throw new Error(`handler id ${id} already registered`)
    }

    this.handlers.set(id, handler)
  }
}
