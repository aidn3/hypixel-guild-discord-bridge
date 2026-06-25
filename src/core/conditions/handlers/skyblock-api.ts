import type {
  ConditionResult,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, ConditionResultType } from '../common'

export class SkyblockApi extends ConditionHandler<SkyblockLevelOptions, boolean> {
  override getId(): string {
    return 'hypixel-skyblock-api-enabled'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-api.title'])
  }

  override displayCondition(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-api.formatted'], {})
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser
  ): Promise<ConditionResult<boolean>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }
    const uuid = mojangProfile.id

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (profiles === undefined || profiles.length === 0) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.never-played-skyblock'])
      }
    }

    for (const profile of profiles) {
      const member = profile.members[uuid]
      if (!('experience' in member.player_data)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-skills-disabled'], {
            profile: profile.cute_name
          })
        }
      }
      if (!('collection' in member)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-collection-disabled'], {
            profile: profile.cute_name
          })
        }
      }
      if (!('inventory' in member.player_data)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-inventory-disabled'], {
            profile: profile.cute_name
          })
        }
      }
      if (!('banking' in profile)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-banking-disabled'], {
            profile: profile.cute_name
          })
        }
      }
      if (Object.keys(profile.members).length > 1 && !('bank_account' in member.profile)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-personal-banking-disabled'], {
            profile: profile.cute_name
          })
        }
      }

      const museum = await context.application.hypixelApi.getSkyblockMuseum(profile.profile_id)
      if (!(uuid in museum.members)) {
        return {
          type: ConditionResultType.Error,
          reason: context.application.i18n.t(($) => $['conditions.format.skyblock-api-museum-disabled'], {
            profile: profile.cute_name
          })
        }
      }
    }

    return {
      type: ConditionResultType.Pass,
      value: true,
      valueFormatted: context.application.i18n.t(($) => $['conditions.format.all-skyblock-api-enabled'])
    }
  }
}

export type SkyblockLevelOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
