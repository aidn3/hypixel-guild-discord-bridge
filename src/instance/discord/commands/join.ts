import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances, Permission } from '../../../common/commands.js'
import { checkChatTriggers, formatChatTriggerResponse, InviteAcceptChat } from '../common/chat-triggers.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('join')
      .setDescription('Instruct the Minecraft account to join a guild.')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('Username of the player or name of the guild')
          .setRequired(true)
          .setAutocomplete(true)
      ) as SlashCommandBuilder,
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const name: string = context.interaction.options.getString('name', true)
    const command = `/g join ${name}`

    const instance: string = context.interaction.options.getString('instance', true)
    const result = await checkChatTriggers(
      context.application,
      context.eventHelper,
      InviteAcceptChat,
      [instance],
      command,
      name
    )
    const formatted = formatChatTriggerResponse(result, `Join ${escapeMarkdown(name)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'name') {
      const response = context.application.autoComplete
        .username(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
