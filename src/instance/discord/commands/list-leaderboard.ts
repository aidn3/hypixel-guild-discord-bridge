import assert from 'node:assert'

import { bold, italic, SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import type { LeaderboardEntry } from '../../../core/discord/discord-leaderboards'
import { DefaultCommandFooter } from '../common/discord-config'

import { Messages30Days, Online30Days, Points30Days } from './create-leaderboard'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('list-leaderboard').setDescription('List all existing leaderboards'),

  handler: async function (context) {
    assert.ok(context.interaction.inGuild())

    const entries = context.application.core.discordLeaderboards.getAll()

    let result = ''
    result +=
      format(
        entries.filter((entry) => entry.type === 'points30Days'),
        Points30Days.name
      ) + '\n'
    result +=
      format(
        entries.filter((entry) => entry.type === 'online30Days'),
        Online30Days.name
      ) + '\n'
    result +=
      format(
        entries.filter((entry) => entry.type === 'messages30Days'),
        Messages30Days.name
      ) + '\n'

    result = result.trim()
    if (result.length === 0) {
      result = italic('No leaderboard to show yet. Create some first!')
    }

    await context.interaction.reply({ embeds: [{ description: result, footer: { text: DefaultCommandFooter } }] })
  }
} satisfies DiscordCommandHandler

function format(entries: LeaderboardEntry[], name: string): string {
  let result = ''

  if (entries.length > 0) {
    result += '\n' + bold(name) + '\n'

    for (const entry of entries) {
      result += `- https://discord.com/channels/@me/${entry.channelId}/${entry.messageId}\n`
    }
  }

  return result
}
