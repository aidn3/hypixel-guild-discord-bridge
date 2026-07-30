import type { ConditionHandler, ConditionOption, ConditionValue } from './common'
import { CatacombsLevel } from './handlers/catacombs-level'
import { HasDiscordRole } from './handlers/has-discord-role'
import { InDiscordServer } from './handlers/in-discord-server'
import { InGuild } from './handlers/in-guild'
import { InGuildAsGuildmaster } from './handlers/in-guild-as-guild-master'
import { InGuildWithGexp } from './handlers/in-guild-with-gexp'
import { InGuildWithRank } from './handlers/in-guild-with-rank'
import { KuudraCollection } from './handlers/kuudra-collection'
import { Linked } from './handlers/linked'
import { NotLinked } from './handlers/not-linked'
import { SkyblockApi } from './handlers/skyblock-api'
import { SkyblockBlazeLevel } from './handlers/skyblock-blaze-slayer-level'
import { SkyblockEndermanLevel } from './handlers/skyblock-enderman-slayer-level'
import { SkyblockLevel } from './handlers/skyblock-level'
import { SkyblockNetworth } from './handlers/skyblock-networth'
import { SkyblockTarantulaLevel } from './handlers/skyblock-spider-slayer-level'
import { SkyblockTotalSlayerXp } from './handlers/skyblock-total-slayer-xp'
import { SkyblockVampireLevel } from './handlers/skyblock-vampire-slayer-level'
import { SkyblockSvenLevel } from './handlers/skyblock-wolf-slayer-level'
import { SkyblockRevenantLevel } from './handlers/skyblock-zombie-slayer-level'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption, ConditionValue>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new NotLinked())
    this.registerHandler(new HasDiscordRole())
    this.registerHandler(new InDiscordServer())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new CatacombsLevel())
    this.registerHandler(new KuudraCollection())
    this.registerHandler(new SkyblockNetworth())
    this.registerHandler(new SkyblockApi())
    this.registerHandler(new SkyblockTotalSlayerXp())
    this.registerHandler(new SkyblockRevenantLevel())
    this.registerHandler(new SkyblockTarantulaLevel())
    this.registerHandler(new SkyblockSvenLevel())
    this.registerHandler(new SkyblockEndermanLevel())
    this.registerHandler(new SkyblockBlazeLevel())
    this.registerHandler(new SkyblockVampireLevel())
    this.registerHandler(new InGuild())
    this.registerHandler(new InGuildWithRank())
    this.registerHandler(new InGuildWithGexp())
    this.registerHandler(new InGuildAsGuildmaster())
  }

  public allHandlers(): ConditionHandler<ConditionOption, ConditionValue>[] {
    return [...this.handlers.values()]
  }

  public get(id: string): ConditionHandler<ConditionOption, ConditionValue> | undefined {
    return this.handlers.get(id)
  }

  public registerHandler(handler: ConditionHandler<ConditionOption, ConditionValue>): void {
    const id = handler.getId()
    if (this.handlers.has(id)) {
      throw new Error(`handler id ${id} already registered`)
    }

    this.handlers.set(id, handler)
  }
}
