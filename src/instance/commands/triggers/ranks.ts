import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { MinecraftGuild } from '../../../core/minecraft/guilds-manager'
import Duration from '../../../utility/duration'
import { searchObjects } from '../../../utility/shared-utility'

export default class Ranks extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['ranks', 'guildranks', 'granks', 'gr'],
      description: 'List guild ranks requirements',
      example: `ranks [GuildName]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const savedGuilds = context.app.core.minecraftGuildsManager.allGuilds()
    if (savedGuilds.length === 0) return `${context.username}, no guild not registered.`

    if (savedGuilds.length === 1) {
      const savedGuild = savedGuilds[0]
      return this.formatRanks(context, savedGuild)
    }

    const query = context.args
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' ')

    if (query.length === 0) {
      return `${context.username}, need to select a guild: ${savedGuilds.map((guild) => guild.name).join(', ')}`
    }

    const savedGuild = searchObjects(query, savedGuilds, (guild) => guild.name).at(0)
    if (savedGuild !== undefined) {
      return this.formatRanks(context, savedGuild)
    }

    return `${context.username}, unknown guild: ${query}`
  }

  private async formatRanks(context: ChatCommandContext, savedGuild: MinecraftGuild): Promise<string> {
    const registry = context.app.core.conditonsRegistry
    const joinConditions = context.app.core.minecraftGuildsManager.getJoinConditions(savedGuild.id)
    const roleConditions = context.app.core.minecraftGuildsManager.getRoleConditions(savedGuild.id)
    const conditionContext = {
      startTime: Date.now() - Duration.minutes(15).toMinutes(),
      application: context.app,
      discordGuild: undefined
    }

    const formattedJoinConditions: string[] = []
    for (const joinCondition of joinConditions) {
      const handler = registry.get(joinCondition.typeId)
      if (handler === undefined) continue
      const formattedMessage = await handler.displayCondition(conditionContext, joinCondition.options)
      formattedJoinConditions.push(`Join ${formattedMessage}`)
    }

    const sortedRoles = savedGuild.roles.toSorted((a, b) => a.priority - b.priority)
    const sortedRoleConditions = []
    for (const sortedRole of sortedRoles) {
      sortedRoleConditions.push(
        ...roleConditions.filter(
          (condition) => condition.role.toLowerCase().trim() === sortedRole.name.toLowerCase().trim()
        )
      )
    }
    const formattedRoleConditions: string[] = []
    for (const roleCondition of sortedRoleConditions) {
      const handler = registry.get(roleCondition.typeId)
      if (handler === undefined) continue
      const formattedMessage = await handler.displayCondition(conditionContext, roleCondition.options)
      formattedRoleConditions.push(`${roleCondition.role}: ${formattedMessage}`)
    }

    if (formattedJoinConditions.length === 0 && formattedRoleConditions.length === 0) {
      return `${context.username}, ${savedGuild.name} does not have any set requirements.`
    }

    return `${savedGuild.name}: ${[...formattedJoinConditions, ...formattedRoleConditions].join(' - ')}`
  }
}
