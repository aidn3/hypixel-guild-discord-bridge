import type { ConditionHandler, ConditionOption } from './common'
import { CatacombsLevel } from './handlers/catacombs-level'
import { HasDiscordRole } from './handlers/has-discord-role'
import { InGuild } from './handlers/in-guild'
import { InGuildAsGuildmaster } from './handlers/in-guild-as-guild-master'
import { InGuildWithRank } from './handlers/in-guild-with-rank'
import { Linked } from './handlers/linked'
import { SkyblockApi } from './handlers/skyblock-api'
import { SkyblockLevel } from './handlers/skyblock-level'
import { SkyblockNetworth } from './handlers/skyblock-networth'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new HasDiscordRole())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new CatacombsLevel())
    this.registerHandler(new SkyblockNetworth())
    this.registerHandler(new SkyblockApi())
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
