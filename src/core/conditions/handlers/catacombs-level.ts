// eslint-disable-next-line import/no-restricted-paths
import { getDungeonLevelWithOverflow } from '../../../instance/commands/common/utility'
// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import type { HandlerContext, HandlerOperationContext, HandlerUser } from '../common'
import { ConditionHandler } from '../common'
import { getSkyblockUserProfiles } from '../utilities'

export class CatacombsLevel extends ConditionHandler<SkyblockCatacombsOptions> {
  override getId(): string {
    return 'reached-hypixel-skyblock-catacombs-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockCatacombsOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.formatted'], {
      fromLevel: options.fromLevel,
      toLevel: options.toLevel
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockCatacombsOptions
  ): Promise<boolean> {
    const profiles = await getSkyblockUserProfiles(context, handlerUser)
    if (profiles.length === 0) return false

    const highestExperience = profiles
      .map((profile) => profile.dungeons?.dungeon_types.catacombs.experience ?? 0)
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce((a, b) => Math.max(a, b))

    const level = getDungeonLevelWithOverflow(highestExperience)
    return level >= condition.fromLevel && level <= condition.toLevel
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'From Catacombs Level',
        key: 'fromLevel',
        max: 10_000,
        min: 0,
        defaultValue: 0
      },
      {
        type: OptionType.Number,
        name: 'To Catacombs Level',
        key: 'toLevel',
        max: 10_000,
        min: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SkyblockCatacombsOptions = { fromLevel: number; toLevel: number }
