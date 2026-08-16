import type { ConditionHandler, ConditionOption, ConditionValue } from './common.js'
import { CatacombsLevel } from './handlers/catacombs-level.js'
import { DungeonsClassAverage } from './handlers/dungeon-class-average.js'
import { HasDiscordRole } from './handlers/has-discord-role.js'
import { InDiscordServer } from './handlers/in-discord-server.js'
import { InGuildAsGuildmaster } from './handlers/in-guild-as-guild-master.js'
import { InGuildWithGexp } from './handlers/in-guild-with-gexp.js'
import { InGuildWithRank } from './handlers/in-guild-with-rank.js'
import { InGuild } from './handlers/in-guild.js'
import { KuudraCollection } from './handlers/kuudra-collection.js'
import { Linked } from './handlers/linked.js'
import { NotLinked } from './handlers/not-linked.js'
import { SkyblockApi } from './handlers/skyblock-api.js'
import { SkyblockBlazeLevel } from './handlers/skyblock-blaze-slayer-level.js'
import { SkyblockEndermanLevel } from './handlers/skyblock-enderman-slayer-level.js'
import { SkyblockLevel } from './handlers/skyblock-level.js'
import { SkyblockNetworth } from './handlers/skyblock-networth.js'
import { SkyblockTarantulaLevel } from './handlers/skyblock-spider-slayer-level.js'
import { SkyblockTotalSlayerXp } from './handlers/skyblock-total-slayer-xp.js'
import { SkyblockVampireLevel } from './handlers/skyblock-vampire-slayer-level.js'
import { SkyblockSvenLevel } from './handlers/skyblock-wolf-slayer-level.js'
import { SkyblockRevenantLevel } from './handlers/skyblock-zombie-slayer-level.js'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption, ConditionValue>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new NotLinked())
    this.registerHandler(new HasDiscordRole())
    this.registerHandler(new InDiscordServer())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new CatacombsLevel())
    this.registerHandler(new DungeonsClassAverage())
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
