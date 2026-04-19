import type { HandlerContext, HandlerOperationContext, HandlerUser, SkyblockProfileOptionType } from '../common'
import { ConditionHandler } from '../common'

export class SkyblockApi extends ConditionHandler<SkyblockLevelOptions> {
  override getId(): string {
    return 'hypixel-skyblock-api-enabled'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-api.title'])
  }

  override displayCondition(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-api.formatted'], {})
  }

  override async meetsCondition(context: HandlerOperationContext, handlerUser: HandlerUser): Promise<boolean> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) return false
    const uuid = mojangProfile.id

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (profiles === undefined) return true

    for (const profile of profiles) {
      const member = profile.members[uuid]
      if (!('experience' in member.player_data)) return false
      if (!('collection' in member)) return false
      if (!('inventory' in member.player_data)) return false
      if (!('banking' in profile)) return false
      if (Object.keys(profile.members).length > 1 && !('bank_account' in member.profile)) return false

      const museum = await context.application.hypixelApi.getSkyblockMuseum(profile.profile_id)
      if (!(uuid in museum.members)) return false
    }

    return true
  }
}

export type SkyblockLevelOptions = SkyblockProfileOptionType & { fromLevel: number; toLevel: number }
