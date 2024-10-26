import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import { checkChatTriggers, formatChatTriggerResponse, RankChat } from '../common/chat-triggers.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('promote')
      .setDescription('promote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.Helper,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g promote ${username}`

    const result = await checkChatTriggers(context.application, RankChat, undefined, command, username)
    const formatted = formatChatTriggerResponse(result, `Promote ${escapeMarkdown(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  }
} satisfies CommandInterface
