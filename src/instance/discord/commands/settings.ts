import {
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js'

import { InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'

import {
  handleDiscordInteraction,
  HelperRoles,
  LogChannel,
  OfficerChannel,
  OfficerRoles,
  PublicChannel
} from './settings/discord.js'
import { handleMinecraftInteraction, MinecraftAdd, MinecraftRemove, MinecraftSetAdmin } from './settings/minecraft.js'
import { handlePluginsInteraction } from './settings/plugins.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('settings')
      .setDescription('Manage application settings')
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('discord')
          .setDescription('change discord settings')
          .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(PublicChannel).setDescription('manage public channels')
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(OfficerChannel).setDescription('manage officer channels')
          )
          .addSubcommand(new SlashCommandSubcommandBuilder().setName(HelperRoles).setDescription('manage helper roles'))
          .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(OfficerRoles).setDescription('manage officer roles')
          )
          .addSubcommand(new SlashCommandSubcommandBuilder().setName(LogChannel).setDescription('manage log channels'))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('minecraft')
          .setDescription('manage minecraft instances')
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('status')
              .setDescription('list all minecraft instances and other settings')
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(MinecraftAdd)
              .setDescription('add a new minecraft instance and connect it')
              .addStringOption((o) =>
                o.setName('name').setDescription('Name of the minecraft instance').setRequired(true)
              )
              .addStringOption((o) => o.setName('proxy').setDescription('e.g. socks5://proxy.example.com:1080'))
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(MinecraftRemove)
              .setDescription('remove a minecraft instance and disconnect it')
              .addStringOption((o) =>
                o
                  .setName('name')
                  .setDescription('Name of the minecraft instance')
                  .setRequired(true)
                  .setAutocomplete(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(MinecraftSetAdmin)
              .setDescription('set the username that will have admin permission in minecraft')
              .addStringOption((o) =>
                o.setName('username').setDescription('username to set as admin').setRequired(true)
              )
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('features')
          .setDescription('manage features and settings')

          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('toggle')
              .setDescription('Select features to enable on the application')
          )
      ) as SlashCommandBuilder,
  permission: Permission.Anyone,
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Disabled,

  handler: async function (context) {
    if (!context.interaction.channel) {
      await context.interaction.reply({
        content: 'This command can only be executed in a text-based guild channel',
        flags: MessageFlags.Ephemeral
      })
      return
    }

    switch (context.interaction.options.getSubcommandGroup()) {
      case 'discord': {
        await handleDiscordInteraction(context)
        break
      }
      case 'minecraft': {
        await handleMinecraftInteraction(context)
        break
      }
      case 'features': {
        await handlePluginsInteraction(context)
        break
      }
    }
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

    if (
      context.interaction.options.getSubcommandGroup() === 'minecraft' &&
      context.interaction.options.getSubcommand() === MinecraftRemove
    ) {
      const response = context.application.clusterHelper
        .getInstancesNames(InstanceType.Minecraft)
        .filter((instance) => instance.toLowerCase().startsWith(option.value.toLowerCase()))
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
