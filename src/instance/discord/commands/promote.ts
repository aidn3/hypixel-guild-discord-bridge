import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import { InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'
import { checkChatTriggers, RankChat } from '../../../util/chat-triggers.js'
import { formatChatTriggerResponse } from '../common/chattrigger-format.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('promote')
      .setDescription('promote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
      ),
  permission: Permission.Helper,
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Disabled,

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
      const response = context.application.usersManager.autoComplete
        .username(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
