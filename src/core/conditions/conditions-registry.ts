import type { ConditionHandler, ConditionOption, ConditionValue } from './common.js'
import { CatacombsLevel } from './handlers/catacombs-level.js'
import { DungeonsClassAverage } from './handlers/dungeon-class-average.js'
import { HasDiscordRole } from './handlers/has-discord-role.js'
import { HypixelRankMvp } from './handlers/hypixel-rank-mvp.js'
import { HypixelRankMvpPlus } from './handlers/hypixel-rank-mvpplus.js'
import { HypixelRankMvpPlusPlus } from './handlers/hypixel-rank-mvpplusplus.js'
import { HypixelRankNone } from './handlers/hypixel-rank-none.js'
import { HypixelRankStaff } from './handlers/hypixel-rank-staff.js'
import { HypixelRankVip } from './handlers/hypixel-rank-vip.js'
import { HypixelRankVipPlus } from './handlers/hypixel-rank-vipplus.js'
import { HypixelRankYoutuber } from './handlers/hypixel-rank-youtuber.js'
import { InDiscordServer } from './handlers/in-discord-server.js'
import { InGuildAsGuildmaster } from './handlers/in-guild-as-guild-master.js'
import { InGuildForDuration } from './handlers/in-guild-for-duration.js'
import { InGuildWithGexp } from './handlers/in-guild-with-gexp.js'
import { InGuildWithRank } from './handlers/in-guild-with-rank.js'
import { InGuild } from './handlers/in-guild.js'
import { KuudraCollection } from './handlers/kuudra-collection.js'
import { Linked } from './handlers/linked.js'
import { NotLinked } from './handlers/not-linked.js'
import { SentMessages } from './handlers/sent-messages.js'
import { SkyblockAlchemyLevel } from './handlers/skyblock-alchemy-level.js'
import { SkyblockApi } from './handlers/skyblock-api.js'
import { SkyblockArcherLevel } from './handlers/skyblock-archer-level.js'
import { SkyblockAverageLevel } from './handlers/skyblock-average-level.js'
import { SkyblockBerserkLevel } from './handlers/skyblock-berserk-level.js'
import { SkyblockBlazeLevel } from './handlers/skyblock-blaze-slayer-level.js'
import { SkyblockCarpentryLevel } from './handlers/skyblock-carpentry-level.js'
import { SkyblockCombatLevel } from './handlers/skyblock-combat-level.js'
import { SkyblockEnchantingLevel } from './handlers/skyblock-enchantng-level.js'
import { SkyblockEndermanLevel } from './handlers/skyblock-enderman-slayer-level.js'
import { SkyblockFarmingLevel } from './handlers/skyblock-farming-level.js'
import { SkyblockFishingLevel } from './handlers/skyblock-fishing-level.js'
import { SkyblockForagingLevel } from './handlers/skyblock-foraging-level.js'
import { SkyblockGuildTopLevel } from './handlers/skyblock-guild-top-level.js'
import { SkyblockHealerLevel } from './handlers/skyblock-healer-level.js'
import { SkyblockHuntingLevel } from './handlers/skyblock-hunting-level.js'
import { KuudraBasic } from './handlers/skyblock-kuudra-basic.js'
import { KuudraBurning } from './handlers/skyblock-kuudra-burning.js'
import { KuudraFiery } from './handlers/skyblock-kuudra-fiery.js'
import { KuudraHot } from './handlers/skyblock-kuudra-hot.js'
import { KuudraInfernal } from './handlers/skyblock-kuudra-infernal.js'
import { SkyblockLevel } from './handlers/skyblock-level.js'
import { SkyblockMageLevel } from './handlers/skyblock-mage-level.js'
import { SkyblockMaxAccessoryPower } from './handlers/skyblock-max-accessory-power.js'
import { SkyblockMiningLevel } from './handlers/skyblock-mining-level.js'
import { SkyblockNetworth } from './handlers/skyblock-networth.js'
import { SkyblockTarantulaLevel } from './handlers/skyblock-spider-slayer-level.js'
import { SkyblockTamingLevel } from './handlers/skyblock-taming-level.js'
import { SkyblockTankLevel } from './handlers/skyblock-tank-level.js'
import { SkyblockTotalSlayerXp } from './handlers/skyblock-total-slayer-xp.js'
import { SkyblockTrophyFishBronze } from './handlers/skyblock-trophy-fish-bronze.js'
import { SkyblockTrophyFishDiamond } from './handlers/skyblock-trophy-fish-diamond.js'
import { SkyblockTrophyFishGold } from './handlers/skyblock-trophy-fish-gold.js'
import { SkyblockTrophyFishSilver } from './handlers/skyblock-trophy-fish-silver.js'
import { SkyblockType } from './handlers/skyblock-type.js'
import { SkyblockVampireLevel } from './handlers/skyblock-vampire-slayer-level.js'
import { SkyblockSvenLevel } from './handlers/skyblock-wolf-slayer-level.js'
import { SkyblockRevenantLevel } from './handlers/skyblock-zombie-slayer-level.js'

export class ConditionsRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption, ConditionValue>>()

  constructor() {
    this.registerHandler(new Linked())
    this.registerHandler(new NotLinked())
    this.registerHandler(new SentMessages())
    this.registerHandler(new HasDiscordRole())
    this.registerHandler(new InDiscordServer())
    this.registerHandler(new SkyblockLevel())
    this.registerHandler(new SkyblockMaxAccessoryPower())
    this.registerHandler(new SkyblockType())
    this.registerHandler(new CatacombsLevel())
    this.registerHandler(new SkyblockHealerLevel())
    this.registerHandler(new SkyblockBerserkLevel())
    this.registerHandler(new SkyblockMageLevel())
    this.registerHandler(new SkyblockArcherLevel())
    this.registerHandler(new SkyblockTankLevel())
    this.registerHandler(new DungeonsClassAverage())
    this.registerHandler(new KuudraCollection())
    this.registerHandler(new KuudraBasic())
    this.registerHandler(new KuudraHot())
    this.registerHandler(new KuudraBurning())
    this.registerHandler(new KuudraFiery())
    this.registerHandler(new KuudraInfernal())
    this.registerHandler(new SkyblockNetworth())
    this.registerHandler(new SkyblockApi())
    this.registerHandler(new SkyblockFarmingLevel())
    this.registerHandler(new SkyblockMiningLevel())
    this.registerHandler(new SkyblockCombatLevel())
    this.registerHandler(new SkyblockForagingLevel())
    this.registerHandler(new SkyblockFishingLevel())
    this.registerHandler(new SkyblockEnchantingLevel())
    this.registerHandler(new SkyblockAlchemyLevel())
    this.registerHandler(new SkyblockCarpentryLevel())
    this.registerHandler(new SkyblockTamingLevel())
    this.registerHandler(new SkyblockHuntingLevel())
    this.registerHandler(new SkyblockAverageLevel())
    this.registerHandler(new SkyblockTotalSlayerXp())
    this.registerHandler(new SkyblockRevenantLevel())
    this.registerHandler(new SkyblockTarantulaLevel())
    this.registerHandler(new SkyblockSvenLevel())
    this.registerHandler(new SkyblockEndermanLevel())
    this.registerHandler(new SkyblockBlazeLevel())
    this.registerHandler(new SkyblockVampireLevel())
    this.registerHandler(new SkyblockTrophyFishBronze())
    this.registerHandler(new SkyblockTrophyFishSilver())
    this.registerHandler(new SkyblockTrophyFishGold())
    this.registerHandler(new SkyblockTrophyFishDiamond())
    this.registerHandler(new SkyblockGuildTopLevel())
    this.registerHandler(new InGuild())
    this.registerHandler(new InGuildWithRank())
    this.registerHandler(new InGuildWithGexp())
    this.registerHandler(new InGuildForDuration())
    this.registerHandler(new InGuildAsGuildmaster())
    this.registerHandler(new HypixelRankNone())
    this.registerHandler(new HypixelRankVip())
    this.registerHandler(new HypixelRankVipPlus())
    this.registerHandler(new HypixelRankMvp())
    this.registerHandler(new HypixelRankMvpPlus())
    this.registerHandler(new HypixelRankMvpPlusPlus())
    this.registerHandler(new HypixelRankYoutuber())
    this.registerHandler(new HypixelRankStaff())
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
