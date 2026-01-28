import type { ConditionHandler, ConditionOption } from './common'
import { CatacombsLevel } from './handlers/catacombs-level'
import { InGuild } from './handlers/in-guild'
import { InGuildAsGuildmaster } from './handlers/in-guild-as-guild-master'
import { InGuildWithRank } from './handlers/in-guild-with-rank'
import { Linked } from './handlers/linked'
import { SkyblockLevel } from './handlers/skyblock-level'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new CatacombsLevel())
    this.registerHandler(new InGuild())
    this.registerHandler(new InGuildWithRank())
    this.registerHandler(new InGuildAsGuildmaster())
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
