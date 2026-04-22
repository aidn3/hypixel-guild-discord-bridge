import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands'
import type { MinecraftUser } from '../../../common/user'
import type { HypixelGuild, HypixelGuildMember } from '../../../core/hypixel/hypixel-guild'
import type { Database, MinecraftGuild, MinecraftGuildRole } from '../database'

export async function resolveGuildRank(
  context: ChatCommandContext,
  database: Database,
  savedGuild: MinecraftGuild,
  guild: HypixelGuild,
  guildMember: HypixelGuildMember,
  targetUser: MinecraftUser
): Promise<{ rank: string; condition: string } | 'not-whitelisted' | 'no-rank' | 'no-condition'> {
  // check if the current rank is default OR explicitly whitelisted to be changed
  // default rank is a special rank that is made as a fallback for other ranks
  const defaultRank = guild.ranks.find((rank) => rank.default)?.name
  assert.ok(defaultRank !== undefined)
  if (guildMember.rank !== undefined && guildMember.rank !== defaultRank) {
    const currentSavedRank = savedGuild.roles.find((role) =>
      guild.ranks.some((guildRank) => guildRank.name === role.name)
    )
    if (!currentSavedRank?.whitelisted) {
      return 'not-whitelisted'
    }
  }

  const sortedRanks = guild.ranks.toSorted((a, b) => a.priority - b.priority)
  const whitelistedRoles: MinecraftGuildRole[] = []
  for (const sortedRank of sortedRanks) {
    const whitelistedRole = savedGuild.roles.find((role) => role.name === sortedRank.name)
    if (whitelistedRole !== undefined) whitelistedRoles.push(whitelistedRole)
  }

  const registry = context.app.core.conditonsRegistry
  const roleConditions = database.getRoleConditions(savedGuild.id)
  const conditionContext = {
    application: context.app,
    startTime: Date.now(),
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
      const meetsCondition = await handler.meetsCondition(conditionContext, { user: targetUser }, roleCondition.options)
      if (meetsCondition) {
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
