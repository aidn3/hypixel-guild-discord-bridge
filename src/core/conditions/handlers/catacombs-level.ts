// eslint-disable-next-line import/no-restricted-paths
import { getDungeonLevelWithOverflow } from '../../../instance/commands/common/utility'
// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import type { HandlerContext, HandlerOperationContext, HandlerUser } from '../common'
import { ConditionHandler } from '../common'
import { checkSkyblockUserProfiles } from '../utilities'

export class CatacombsLevel extends ConditionHandler<SkyblockCatacombsOptions> {
  override getId(): string {
    return 'reached-hypixel-skyblock-catacombs-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockCatacombsOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-catacombs-level.formatted'], {
      level: options.level
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockCatacombsOptions
  ): Promise<boolean> {
    return checkSkyblockUserProfiles(context, handlerUser, (profile) => {
      const experience = profile.dungeons?.dungeon_types.catacombs.experience ?? 0
      const level = getDungeonLevelWithOverflow(experience)
      return level >= condition.level
    })
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'Catacombs Level',
        key: 'level',
        max: 1000,
        min: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SkyblockCatacombsOptions = { level: number }
