import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import { InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { checkChatTriggers, RankChat } from '../../../utility/chat-triggers.js'
import { search } from '../../../utility/shared-utility'
import { formatChatTriggerResponse } from '../common/chattrigger-format.js'
import { autocompleteAllMembers } from '../common/commands-utility'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('promote')
      .setDescription('Promote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
      ),
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const instances = context.application.getInstancesNames(InstanceType.Minecraft)
    const command = `/g promote ${username}`

    const result = await checkChatTriggers(
      context.application,
      context.eventHelper,
      RankChat,
      instances,
      command,
      username
    )
    const formatted = formatChatTriggerResponse(result, `Promote ${escapeMarkdown(username)}`)

    await context.interaction.editReply({ embeds: [formatted] })
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const members = await autocompleteAllMembers(context.application)
      const response = search(
        option.value,
        members.map((member) => member.username)
      )
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
