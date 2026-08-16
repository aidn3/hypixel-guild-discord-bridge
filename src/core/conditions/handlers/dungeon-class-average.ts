// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler.js'
import type { SkyblockMember } from '../../hypixel/hypixel-skyblock.js'
import { getDungeonLevelWithOverflow } from '../../hypixel/hypixel-skyblock.js'
import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common.js'
import {
  ConditionHandler,
  ConditionResultType,
  SkyblockProfileOption,
  translateSkyblockProfileTypes
} from '../common.js'
import { formatPrimitiveValue, getSkyblockUserProfiles } from '../utilities.js'

export class DungeonsClassAverage extends ConditionHandler<DungeonsClassAverageOptions, number> {
  override getId(): string {
    return 'hypixel-skyblock-dungeon-class-average'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.class-average.title'])
  }

  override displayCondition(context: HandlerContext, options: DungeonsClassAverageOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.class-average.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: DungeonsClassAverageOptions
  ): Promise<ConditionResult<number>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const profiles = await getSkyblockUserProfiles(context, mojangProfile, condition.profileTypes)
    if (profiles.length === 0) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-skyblock'])
      }
    }

    const rawLevel = profiles
      .map((profile) => this.getClassAverage(profile))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))
    const level = Math.floor(rawLevel)

    return {
      type:
        level >= condition.fromLevel && level <= condition.toLevel
          ? ConditionResultType.Pass
          : ConditionResultType.Fail,
      value: level,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, level)
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      SkyblockProfileOption,
      {
        type: OptionType.Number,
        name: 'From Class Average Level',
        key: 'fromLevel',
        max: 500,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Class Average Level',
        key: 'toLevel',
        max: 500,
        min: 1
      }
    ]
  }

  private getClassAverage(profile: SkyblockMember): number {
    const dungeons = profile.dungeons
    if (!dungeons) return 0

    const healer = getDungeonLevelWithOverflow(dungeons.player_classes?.healer?.experience ?? 0)
    const mage = getDungeonLevelWithOverflow(dungeons.player_classes?.mage?.experience ?? 0)
    const berserk = getDungeonLevelWithOverflow(dungeons.player_classes?.berserk?.experience ?? 0)
    const archer = getDungeonLevelWithOverflow(dungeons.player_classes?.archer?.experience ?? 0)
    const tank = getDungeonLevelWithOverflow(dungeons.player_classes?.tank?.experience ?? 0)

    const classes = [healer, mage, berserk, archer, tank]
    const MaxOfficialLevel = 50
    // cap it to official level if player hasn't reached the max level already
    if (classes.some((entry) => entry < MaxOfficialLevel)) {
      return classes.map((entry) => Math.min(entry, MaxOfficialLevel)).reduce((a, b) => a + b) / classes.length
    }

    // uncapped overflow
    return classes.reduce((a, b) => a + b) / classes.length
  }
}

export type DungeonsClassAverageOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
