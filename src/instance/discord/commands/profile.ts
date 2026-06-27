import { PermissionFlagsBits } from 'discord-api-types/v10'
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import { CommandOrigin } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Customize Bot profile inside a Discord server.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('set')
          .setDescription('Set properties of the profile')
          .addAttachmentOption((o) => o.setName('avatar').setDescription('The picture to set as the profile picture'))
          .addAttachmentOption((o) => o.setName('banner').setDescription('The picture to set as the profile banner'))
          .addStringOption((o) => o.setName('bio').setDescription('The text to set as the profile bio description'))
      )
      .addSubcommand(new SlashCommandSubcommandBuilder().setName('reset').setDescription('Reset all customizations.')),
  origin: CommandOrigin.Guild,
  onlyAdmins: false,

  handler: async function (context) {
    switch (context.interaction.options.getSubcommand(true)) {
      case 'set': {
        await handleSet(context)
        break
      }
      case 'reset': {
        await handleReset(context)
        break
      }
    }
  }
} satisfies DiscordCommandHandler

async function handleReset(context: DiscordCommandContext<CommandOrigin.Guild, void>): Promise<void> {
  const interaction = context.interaction
  await interaction.deferReply()

  const guild = interaction.inCachedGuild()
    ? interaction.guild
    : await interaction.client.guilds.fetch(interaction.guildId)

  // eslint-disable-next-line unicorn/no-null
  await guild.members.editMe({ avatar: null, bio: null, banner: null })
  await interaction.editReply('Done.')
}

async function handleSet(context: DiscordCommandContext<CommandOrigin.Guild, void>): Promise<void> {
  const avatarAttachment = context.interaction.options.getAttachment('avatar')
  const bannerAttachment = context.interaction.options.getAttachment('banner')
  const bio = context.interaction.options.getString('bio')
  if (avatarAttachment == undefined && bannerAttachment == undefined && bio == undefined) {
    await context.interaction.reply('You must at least select an option when executing the command!')
    return
  }

  const admin = context.application.core.adminConfigurations

  if (avatarAttachment != undefined) {
    if (!admin.getAllowCustomPicture()) {
      await context.interaction.reply("Setting custom avatar is disabled by the application' admin")
      return
    } else if (!avatarAttachment.contentType?.startsWith('image/')) {
      await context.interaction.reply('The avatar attachment must be an image of JPEG type.')
      return
    }
  }

  if (bannerAttachment != undefined) {
    if (!admin.getAllowCustomBanner()) {
      await context.interaction.reply("Setting custom banner is disabled by the application' admin")
      return
    } else if (!bannerAttachment.contentType?.startsWith('image/')) {
      await context.interaction.reply('The banner attachment must be an image of JPEG type.')
      return
    }
  }

  if (bio != undefined && !admin.getAllowCustomBio()) {
    await context.interaction.reply("Setting custom bio description is disabled by the application' admin")
    return
  }

  const interaction = context.interaction
  await interaction.deferReply()

  const guild = interaction.inCachedGuild()
    ? interaction.guild
    : await interaction.client.guilds.fetch(interaction.guildId)

  await guild.members.editMe({ avatar: avatarAttachment?.url, banner: bannerAttachment?.url, bio: bio })
  await interaction.editReply('Done.')
}
