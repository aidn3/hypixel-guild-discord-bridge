import type { APIEmbed, APIEmbedField } from 'discord.js'
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import type { UserLink } from '../../../common/application-event.js'
import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import type { MojangApi } from '../../../core/users/mojang'
import { formatInvalidUsername } from '../common/commands-format.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('verification')
      .setDescription('Manage users links')
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('query-minecraft')
          .setDescription('Query a Minecraft account')
          .addStringOption((option) =>
            option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('query-discord')
          .setDescription('query a Discord account')
          .addUserOption((option) => option.setName('user').setDescription('User to query').setRequired(true))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('unlink-minecraft')
          .setDescription('Unlink a Minecraft account')
          .addStringOption((option) =>
            option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('unlink-discord')
          .setDescription('Unlink a Discord account')
          .addUserOption((option) =>
            option.setName('user').setDescription('User to associate with the username').setRequired(true)
          )
      ),

  permission: Permission.Helper,

  handler: async function (context) {
    const interaction = context.interaction
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
      case 'query-minecraft': {
        await handleQueryMinecraft(context)
        break
      }
      case 'query-discord': {
        await handleQueryDiscord(context)
        break
      }
      case 'unlink-minecraft': {
        await handleUnlinkMinecraft(context)
        break
      }
      case 'unlink-discord': {
        await handleUnlinkDiscord(context)
        break
      }
    }
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function handleUnlinkMinecraft(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const username: string = interaction.options.getString('username', true)

  const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
  if (mojangProfile === undefined) {
    await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
    return
  }

  const count = context.application.core.verification.invalidate({ uuid: mojangProfile.id })
  await (count > 0 ? interaction.editReply('Successfully unlinked!') : interaction.editReply('Nothing to unlink!'))
}

async function handleUnlinkDiscord(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const user = interaction.options.getUser('user', true)
  const count = context.application.core.verification.invalidate({ discordId: user.id })
  await (count > 0 ? interaction.editReply('Successfully unlinked!') : interaction.editReply('Nothing to unlink!'))
}

async function handleQueryMinecraft(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const username: string = interaction.options.getString('username', true)

  const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
  if (mojangProfile === undefined) {
    await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
    return
  }

  const link = await context.application.core.verification.findByIngame(mojangProfile.id)
  await interaction.editReply({
    embeds: [await formatLink(context.application.mojangApi, link, `\`${mojangProfile.name}\``)]
  })
}

async function handleQueryDiscord(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const user = interaction.options.getUser('user', true)
  const link = await context.application.core.verification.findByDiscord(user.id)
  await interaction.editReply({ embeds: [await formatLink(context.application.mojangApi, link, `<@${user.id}>`)] })
}

async function formatLink(mojangApi: MojangApi, link: UserLink | undefined, displayName: string): Promise<APIEmbed> {
  const fields: APIEmbedField[] = []

  let description: string
  if (link === undefined) {
    description = `${displayName} has no links`
  } else {
    description = 'User has linked.'

    fields.push({ name: 'user', value: `<@${link.discordId}>` })
    const mojangProfile = await mojangApi.profileByUuid(link.uuid).catch(() => undefined)

    if (mojangProfile !== undefined) fields.push({ name: 'username', value: `\`${mojangProfile.name}\`` })
    fields.push({ name: 'uuid', value: `\`${link.uuid}\`` })
  }

  return {
    title: 'Link Status',
    description: description,
    fields: fields,
    color: Color.Default,
    footer: { text: DefaultCommandFooter }
  }
}
