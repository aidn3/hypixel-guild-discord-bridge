import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { Permission } from '../../../common/commands.js'
import { checkChatTriggers, formatChatTriggerResponse, InviteAcceptChat } from '../common/chat-triggers.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('invite')
      .setDescription('invite player to the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
      ) as SlashCommandBuilder,
  allowInstance: true,

  permission: Permission.Helper,
  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g invite ${username}`

    const instance: string | undefined = context.interaction.options.getString('instance') ?? undefined
    const result = await checkChatTriggers(
      context.application,
      context.eventHelper,
      InviteAcceptChat,
      instance,
      command,
      username
    )
    const formatted = formatChatTriggerResponse(result, `Invite ${escapeMarkdown(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.autoComplete
        .username(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
