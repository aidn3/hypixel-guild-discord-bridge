import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { Permission } from '../../../common/commands.js'
import { checkChatTriggers, formatChatTriggerResponse, InviteAcceptChat } from '../common/chat-triggers.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('accept')
      .setDescription('accept a player to the guild if they have a join request in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g accept ${username}`

    const instance: string | null = context.interaction.options.getString('instance')
    const result = await checkChatTriggers(
      context.application,
      InviteAcceptChat,
      instance ?? undefined,
      command,
      username
    )
    const formatted = formatChatTriggerResponse(result, `Accept ${escapeMarkdown(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  }
} satisfies DiscordCommandHandler
