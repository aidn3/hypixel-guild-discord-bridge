// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler'
import type { HandlerContext, HandlerOperationContext, HandlerUser } from '../common'
import { ConditionHandler } from '../common'
import { checkSkyblockUserProfiles } from '../utilities'

export class SkyblockLevel extends ConditionHandler<SkyblockLevelOptions> {
  override getId(): string {
    return 'reached-hypixel-skyblock-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockLevelOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.formatted'], {
      level: options.level
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockLevelOptions
  ): Promise<boolean> {
    return checkSkyblockUserProfiles(context, handlerUser, (profile) => {
      return (profile.leveling?.experience ?? 0) / 100 >= condition.level
    })
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'Skyblock Level',
        key: 'level',
        max: 1000,
        min: 1
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SkyblockLevelOptions = { level: number }
