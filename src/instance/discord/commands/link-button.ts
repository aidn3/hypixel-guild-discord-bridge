import assert from 'node:assert'

import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10'
import { ButtonStyle, ComponentType, SlashCommandBuilder, TextChannel } from 'discord.js'

import { Color } from '../../../common/application-event'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import LinkButtonsManager from '../features/link-buttons-manager'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('link-panel').setDescription('Create a panel with buttons to help users link'),

  handler: async function (context) {
    const interaction = context.interaction
    const channel = interaction.channel
    if (!interaction.inGuild() || !(channel instanceof TextChannel) || !channel.isSendable()) {
      await interaction.reply({
        content: 'This command can only be used inside a text channel in a Discord server.',
        flags: MessageFlags.Ephemeral
      })
      return
    }
    assert.ok(interaction.inCachedGuild())
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const permissions = channel.permissionsFor(interaction.client.user)
    assert.ok(permissions != undefined)
    if (!permissions.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content:
          'Application does not have permission to send messages in this channel.' +
          '\nPlease give the application permissions first before trying again.',
        flags: MessageFlags.Ephemeral
      })
    }
    const guildCommands = await interaction.guild.commands.fetch()
    const linkCommand = guildCommands.find((command) => command.name === 'link')
    const syncCommand = guildCommands.find((command) => command.name === 'sync')

    const message =
      '## Account linking & roles/name syncing' +
      '\nLink your Minecraft account to access guild features.' +
      '\nThis will also set your roles and nickname automatically.' +
      '\n\nUse this as many times as you like to update your roles and nickname as well!' +
      `\nAlternatively, use </link:${linkCommand?.id}> to link and </sync:${syncCommand?.id}> to sync.` +
      '\n\n-# This will only ask your Minecraft username and uses your Hypixel "socials".' +
      '\n-# It will NOT ask for your email or password or anything like that.' +
      '\n-# If you feel uncomfortable, ask a staff for help to make an exception for you.'
    const reply = await channel.send({
      components: [
        {
          type: ComponentType.Container,
          components: [{ type: ComponentType.TextDisplay, content: message }],
          accentColor: Color.Good
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: ButtonStyle.Primary,
              customId: LinkButtonsManager.AutoLinkId,
              label: 'Link'
            }
          ]
        }
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    })
    context.application.core.discordLinkButton.add(reply.id)

    await interaction.editReply(
      `Message sent: https://discord.com/channels/${reply.guildId}/${reply.channelId}/${reply.id}`
    )
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
