import assert from 'node:assert'

import type { Guild, GuildMember } from 'discord.js'
import { bold, escapeMarkdown, roleMention, SlashCommandBuilder, userMention } from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandOrigin } from '../../../common/commands.js'
import type { HandlerDisplayContext } from '../../../core/conditions/common.js'
import { ConditionResultType } from '../../../core/conditions/common.js'
import type { RoleCondition } from '../../../core/discord/user-conditions.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type { UpdateContext, UpdateProgress } from '../conditions/common.js'
import type { ConditionUpdateResult } from '../conditions/conditions-manager.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('sync')
      .setDescription('Synchronize roles and other user options')
      .addUserOption((o) => o.setName('user').setDescription('User to synchronize')),

  origin: CommandOrigin.Guild,
  onlyAdmins: false,

  handler: async function (context) {
    const interaction = context.interaction

    assert.ok(interaction.inGuild())
    assert.ok(interaction.inCachedGuild())

    const optionalUser = interaction.options.getUser('user') ?? undefined
    let guildMember: GuildMember

    if (optionalUser) {
      if (context.permission < Permission.Helper) {
        await context.showPermissionDenied(Permission.Helper)
        return
      }

      await interaction.deferReply()
      guildMember = await interaction.guild.members.fetch(optionalUser.id)
    } else {
      await interaction.deferReply()
      guildMember = await interaction.member.fetch()
    }

    if (guildMember.user.bot) {
      await interaction.editReply('Can not sync another bot roles')
      return
    }

    const user = await context.application.core.initializeDiscordUser(
      context.application.discordInstance.profileByUser(guildMember.user, guildMember)
    )

    const commands = interaction.client.application.commands.cache
    const linkCommand = commands.find((command) => command.name === 'link')
    assert.ok(linkCommand)

    const progress: UpdateProgress = {
      totalGuilds: 0,
      processedGuilds: 0,
      totalUsers: 0,
      processedUsers: 0,
      processedRoles: 0,
      processedNicknames: 0,
      errors: []
    }
    const updateContext = {
      application: context.application,
      updateReason: `Manual sync via /sync by ${interaction.user.username}`,
      abortSignal: new AbortController().signal,
      startTime: Date.now(),
      progress: progress
    } satisfies UpdateContext

    const updateResult = await context.application.discordInstance.conditionsManager.updateMember(updateContext, {
      guildMember,
      user
    })

    let result = `Synced ${userMention(guildMember.id)}`
    if (updateResult.roles.length > 0) {
      result += '\n\n'
      result += await displayMessage(updateContext, interaction.guild, updateResult.roles)
    }
    if (progress.errors.length > 0) {
      result += `\n\n**Failed syncing some conditions:**\n`
      result += progress.errors.map((error) => `- ${escapeMarkdown(error)}`).join('\n')
    }
    const embed = {
      description: result,
      color: progress.errors.length > 0 ? Color.Info : Color.Good,
      footer: { text: DefaultCommandFooter }
    }

    if (!user.verified()) {
      embed.description += `\n\nUser not Linked yet. Remember to always </link:${linkCommand.id}>!`
      embed.color = Color.Info
    }

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } })
  }
} satisfies DiscordCommandHandler

async function displayMessage(
  updateContext: UpdateContext,
  guild: Guild,
  roles: ConditionUpdateResult<RoleCondition>[]
): Promise<string> {
  const MaxShownConditions = 5

  const context: HandlerDisplayContext = {
    application: updateContext.application,
    startTime: updateContext.startTime,
    discordGuild: guild
  }

  const result: string[] = []
  for (const role of roles) {
    if (role.result?.type !== ConditionResultType.Pass) continue

    const roleResult = await formatRoleCondition(context, role)
    result.push(roleResult)
  }

  for (const role of roles) {
    if (result.length >= MaxShownConditions) continue
    if (role.result?.type === ConditionResultType.Pass) continue

    const roleResult = await formatRoleCondition(context, role)
    result.push(roleResult)
  }

  return result.join('\n').trim()
}

async function formatRoleCondition(
  context: HandlerDisplayContext,
  role: ConditionUpdateResult<RoleCondition>
): Promise<string> {
  const conditionResult = role.result
  const conditionMet = conditionResult?.type === ConditionResultType.Pass

  let message = ''
  message += `- ${conditionMet ? '✅' : '❌'}`
  message += ` ${roleMention(role.condition.roleId)} `
  const display = await role.handler.displayCondition(context, role.condition.options)
  message += bold(escapeMarkdown(display))

  if (conditionResult?.type === ConditionResultType.Pass || conditionResult?.type === ConditionResultType.Fail) {
    message += `: ${escapeMarkdown(conditionResult.valueFormatted)}`
  } else if (conditionResult?.type === ConditionResultType.Error) {
    message += `: ${escapeMarkdown(conditionResult.reason)}`
  }

  return message
}
