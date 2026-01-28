import assert from 'node:assert'

import type { GuildMember } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder, userMention } from 'discord.js'

import { Color, Permission } from '../../../common/application-event'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config'
import type { UpdateContext, UpdateProgress } from '../conditions/common'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('sync')
      .setDescription('synchronize roles and other user options')
      .addUserOption((o) => o.setName('user').setDescription('User to synchronize')),

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
      context.application.discordInstance.profileByUser(guildMember.user, guildMember),
      { guild: guildMember.guild }
    )

    const guildCommands = await interaction.guild.commands.fetch()
    const linkCommand = guildCommands.find((command) => command.name === 'link')
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
      updateReason: `Manual sync via /${context.interaction.commandName} by ${interaction.user.username}`,
      abortSignal: new AbortController().signal,
      startTime: Date.now(),
      progress: progress
    } satisfies UpdateContext

    await context.application.discordInstance.conditionsManager.updateMember(updateContext, { guildMember, user })

    let result = `Synced ${userMention(guildMember.id)}`
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
