import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createGuildEmbed(
  guildName: string,
  tag: string | undefined,
  level: number,
  members: number,
  weeklyGexp: number,
  created: Date
): APIEmbed {
  return {
    color: Color.Default,
    title: `🏆 Guild: ${guildName}${tag ? ` [${tag}]` : ''}`,
    fields: [
      { name: 'Level', value: level.toString(), inline: true },
      { name: 'Members', value: `${members}/125`, inline: true },
      { name: 'Weekly GEXP', value: weeklyGexp.toLocaleString(), inline: true },
      { name: 'Created', value: `<t:${Math.floor(created.getTime() / 1000)}:R>`, inline: true }
    ],
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('guild')
      .setDescription('View guild information')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('type')
          .setDescription('Search type')
          .setRequired(true)
          .addChoices({ name: 'By Player', value: 'player' }, { name: 'By Name', value: 'name' })
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('query')
          .setDescription('Player username or guild name')
          .setRequired(true)
      ),

  handler: async function (context) {
    const type = context.interaction.options.getString('type', true)
    const query = context.interaction.options.getString('query', true)

    await context.interaction.deferReply()

    try {
      let guild

      if (type === 'player') {
        // Get UUID first
        const profile = await context.application.mojangApi.profileByUsername(query).catch(() => undefined)
        if (!profile) {
          await context.interaction.editReply(`Could not find player: \`${query}\``)
          return
        }

        guild = await context.application.hypixelApi.getGuild('player', profile.id, {}).catch(() => undefined)
      } else {
        guild = await context.application.hypixelApi.getGuild('name', query, {}).catch(() => undefined)
      }

      if (!guild) {
        await context.interaction.editReply(
          type === 'player' ? `\`${query}\` is not in a guild.` : `Guild \`${query}\` not found.`
        )
        return
      }

      await context.interaction.editReply({
        embeds: [
          createGuildEmbed(
            guild.name,
            guild.tag,
            guild.level,
            guild.members.length,
            guild.totalWeeklyGexp,
            guild.createdAt
          )
        ]
      })
    } catch (error) {
      context.logger.error('Error fetching guild:', error)
      await context.interaction.editReply(`An error occurred while fetching guild information.`)
    }
  }
} satisfies DiscordCommandHandler
