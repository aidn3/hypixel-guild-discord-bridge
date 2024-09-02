import { SlashCommandBuilder } from 'discord.js'

import { escapeDiscord } from '../../../util/shared-util.js'
import { checkChatTriggers, formatChatTriggerResponse, RANK_CHAT } from '../common/chat-triggers.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('demote')
      .setDescription('demote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g demote ${username}`

    const result = await checkChatTriggers(context.application, RANK_CHAT, undefined, command, username)
    const formatted = formatChatTriggerResponse(result, `Demote ${escapeDiscord(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  }
} satisfies CommandInterface
