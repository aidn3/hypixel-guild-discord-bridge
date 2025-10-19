import assert from 'node:assert'

import { bold, SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config'
import type { LeaderboardEntry } from '../features/leaderboard'

import { Messages30Days, Online30Days, Points30Days } from './create-leaderboard'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('list-leaderboard').setDescription('List all existing leaderboards'),

  handler: async function (context) {
    assert.ok(context.interaction.inGuild())

    const config = context.application.discordInstance.leaderboard.getConfig()

    let result = ''
    result += format(config.data.points30Days, Points30Days.name) + '\n'
    result += format(config.data.online30Days, Online30Days.name) + '\n'
    result += format(config.data.messages30Days, Messages30Days.name) + '\n'

    await context.interaction.reply({
      embeds: [
        {
          description: result.trim(),
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
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
