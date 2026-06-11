import assert from 'node:assert'

import type Application from '../../../application'
import type { MinecraftUser } from '../../../common/user'
import { ConditionResultType } from '../../../core/conditions/common'
import type { HypixelGuild, HypixelGuildMember } from '../../../core/hypixel/hypixel-guild'
import type { Database, MinecraftGuild, MinecraftGuildRole } from '../database'

export async function resolveGuildRank(
  application: Application,
  database: Database,
  currentTime: number,
  savedGuild: MinecraftGuild,
  guild: HypixelGuild,
  guildMember: HypixelGuildMember,
  targetUser: MinecraftUser
): Promise<{ rank: string; condition: string } | 'not-whitelisted' | 'no-rank' | 'no-condition'> {
  const defaultRank = guild.ranks.find((rank) => rank.default)?.name
  assert.ok(defaultRank !== undefined)
  const memberRank = guildMember.rank ?? defaultRank
  const currentSavedRank = savedGuild.roles.find((role) => role.name === memberRank)
  if (!currentSavedRank?.whitelisted) {
    return 'not-whitelisted'
  }

  const sortedRanks = guild.ranks.toSorted((a, b) => a.priority - b.priority)
  const whitelistedRoles: MinecraftGuildRole[] = []
  for (const sortedRank of sortedRanks) {
    if (sortedRank.default) continue // default used as a fallback in case no condition is met

    const whitelistedRole = savedGuild.roles.find((role) => role.name === sortedRank.name)
    if (whitelistedRole !== undefined) whitelistedRoles.push(whitelistedRole)
  }

  const registry = application.core.conditonsRegistry
  const roleConditions = database.getRoleConditions(savedGuild.id)
  const conditionContext = {
    application: application,
    startTime: currentTime,
    abortSignal: new AbortController().signal
  }

  if (roleConditions.length === 0) {
    return 'no-condition'
  }

  for (const whitelistedRole of whitelistedRoles.toReversed()) {
    for (const roleCondition of roleConditions) {
      if (whitelistedRole.name !== roleCondition.role) continue
      const handler = registry.get(roleCondition.typeId)
      if (handler === undefined) continue
      const conditionsResult = await handler.meetsCondition(
        conditionContext,
        { user: targetUser },
        roleCondition.options
      )
      if (conditionsResult.type === ConditionResultType.Pass) {
        const display = await handler.displayCondition(
          { ...conditionContext, discordGuild: undefined },
          roleCondition.options
        )
        return { rank: whitelistedRole.name, condition: display }
      }
    }
  }

  return 'no-rank'
}
