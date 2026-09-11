import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { OptionType } from '../../../instance/discord/utility/options-handler.js'
import type { SkyblockProfile } from '../../hypixel/hypixel-skyblock.js'
import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser
} from '../common.js'
import { ConditionHandler, ConditionResultType, SkyblockProfileOption } from '../common.js'
import { formatPrimitiveValue } from '../utilities.js'

export class SkyblockType extends ConditionHandler<SkyblockLevelOptions, string> {
  override getId(): string {
    return 'hypixel-skyblock-profile-type'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-type.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockLevelOptions): string {
    switch (options.profileType) {
      case 'classic': {
        return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-type.formatted-classic'])
      }
      case 'ironman': {
        return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-type.formatted-ironman'])
      }
      case 'bingo': {
        return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-type.formatted-bingo'])
      }
      case 'island': {
        return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-type.formatted-island'])
      }
      default: {
        options.profileType satisfies never
        return this.getDisplayName(context)
      }
    }
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockLevelOptions
  ): Promise<ConditionResult<string>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(mojangProfile.id, context.startTime)
    if (!profiles) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-skyblock'])
      }
    }

    const uuid = mojangProfile.id
    let highestProfile: SkyblockProfile | undefined = undefined
    let highestExperience = -1
    for (const profile of profiles) {
      const currentExperience = profile.members[uuid].leveling?.experience ?? 0
      if (currentExperience > highestExperience) {
        highestProfile = profile
        highestExperience = currentExperience
      }
    }

    assert.ok(highestProfile !== undefined)
    const profileType = highestProfile.game_mode ?? 'classic'

    return {
      type: profileType === condition.profileType ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: profileType,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, profileType)
    }
  }

  override createCondition(context: HandlerContext, rawOptions: ConditionOption): SkyblockLevelOptions {
    return { profileType: (rawOptions.profileType as SkyblockLevelOptions['profileType'][])[0] }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.PresetList,
        name: 'Profile Type',
        description: 'Which Skyblock profile type to check as the highest level.',
        key: 'profileType',
        min: 1,
        max: 1,
        options: SkyblockProfileOption.options
      }
    ]
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SkyblockLevelOptions = { profileType: 'classic' | 'ironman' | 'bingo' | 'island' }
