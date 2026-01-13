import type { ModalOption } from '../../utility/modal-options'
import { OptionType } from '../../utility/options-handler'
import type { HandlerContext, UpdateMemberContext } from '../common'
import { ConditionHandler } from '../common'
import { checkSkyblockUserProfiles } from '../utilities'

export class SkyblockLevel extends ConditionHandler<SkyblockLevelOptions> {
  override getId(): string {
    return 'reached-hypixel-skyblock-level'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.title'])
  }

  override displayCondition(context: UpdateMemberContext, options: SkyblockLevelOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-level.formatted'], {
      level: options.level
    })
  }

  override async meetsCondition(context: UpdateMemberContext, condition: SkyblockLevelOptions): Promise<boolean> {
    return checkSkyblockUserProfiles(context, (profile) => {
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
