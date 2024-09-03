import { SlashCommandBuilder } from 'discord.js'

import { escapeDiscord } from '../../../util/shared-util.js'
import { checkChatTriggers, formatChatTriggerResponse, RankChat } from '../common/chat-triggers.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('setrank')
      .setDescription('setrank guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('rank').setDescription('rank to change to').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const rank: string = context.interaction.options.getString('rank', true)

    const command = `/g setrank ${username} ${rank}`
    const result = await checkChatTriggers(context.application, RankChat, undefined, command, username)
    const formatted = formatChatTriggerResponse(result, `Setrank ${escapeDiscord(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  }
} satisfies CommandInterface
