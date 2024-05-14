import { SlashCommandBuilder } from 'discord.js'

import { escapeDiscord } from '../../../util/shared-util.js'
import { checkChatTriggers, formatChatTriggerResponse, INVITE_ACCEPT_CHAT } from '../common/chat-triggers.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('invite')
      .setDescription('invite player to the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,

  permission: Permission.HELPER,
  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g invite ${username}`

    const instance: string | null = context.interaction.options.getString('instance')
    const result = await checkChatTriggers(
      context.application,
      INVITE_ACCEPT_CHAT,
      instance ?? undefined,
      command,
      username
    )
    const formatted = formatChatTriggerResponse(result, `Invite ${escapeDiscord(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  }
} satisfies CommandInterface
