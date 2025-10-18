import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import { InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { checkChatTriggers, RankChat } from '../../../utility/chat-triggers.js'
import { formatChatTriggerResponse } from '../common/chattrigger-format.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('setrank')
      .setDescription('setrank guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
      )
      .addStringOption((option) =>
        option.setName('rank').setDescription('rank to change to').setRequired(true).setAutocomplete(true)
      ),
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const instances = context.application.getInstancesNames(InstanceType.Minecraft)
    const rank: string = context.interaction.options.getString('rank', true)

    const command = `/g setrank ${username} ${rank}`
    const result = await checkChatTriggers(
      context.application,
      context.eventHelper,
      RankChat,
      instances,
      command,
      username
    )
    const formatted = formatChatTriggerResponse(result, `Setrank ${escapeMarkdown(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    } else if (option.name === 'rank') {
      const response = context.application.core
        .completeRank(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
