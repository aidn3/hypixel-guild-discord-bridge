import type { APIEmbed, APIEmbedField, ChatInputCommandInteraction } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import type { MojangApi } from '../../../util/mojang.js'
import type { Link } from '../../users/features/verification.js'
import { LinkType } from '../../users/features/verification.js'
import { formatInvalidUsername } from '../common/commands-format.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('verification')
      .setDescription('Manage users links')
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('alias')
          .setDescription('Give a Minecraft username alias to a Discord account')
          .addUserOption((option) =>
            option.setName('user').setDescription('User to associate with the username').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
          )
      )
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
      case 'alias': {
        await handleAlias(context, interaction)
        break
      }
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
      const response = context.application.usersManager.autoComplete
        .username(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function handleAlias(
  context: Readonly<DiscordCommandContext>,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply()

  const user = interaction.options.getUser('user', true)
  const username: string = interaction.options.getString('username', true)

  const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
  if (mojangProfile === undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: 'Could not find the username',
          color: Color.Bad,
          description: `Can't resolve username \`${escapeMarkdown(username)}\`.\n` + 'Make sure of username spelling.',
          fields: [
            {
              name: 'How usernames are written?',
              value:
                'Usernames are made out of 2-16 letter and can only have:\n' +
                '- alphabet letters (A-Z)\n' +
                '- numbers (0-9)\n' +
                "- underscore '_'"
            },
            {
              name: "I'm sure the username is valid!",
              value:
                'It could be Mojang fault for not resolving it (e.g. their servers are down).\n' +
                'If problem persists, contact an admin for support'
            }
          ],
          footer: { text: DefaultCommandFooter }
        }
      ]
    })

    return
  }

  let originalLink = await context.application.usersManager.verification.findByDiscord(user.id)
  if (originalLink.type !== LinkType.Confirmed) {
    originalLink = await context.application.usersManager.verification.findByIngame(mojangProfile.id)
  }

  if (originalLink.type === LinkType.Confirmed) {
    const originalName = await context.application.mojangApi
      .profileByUuid(originalLink.link.uuid)
      .then((profile) => profile.name)
      .catch(() => originalLink.link.uuid)

    await interaction.editReply({
      embeds: [
        {
          title: `Failed Setting Alias`,
          description:
            `User <@${user.id}> has personally linked to \`${originalName}\`.\n` +
            `Invalidate the original link via </verification unlink-discord:${interaction.commandId}> first!`,
          color: Color.Error,
          footer: { text: DefaultCommandFooter }
        }
      ],
      allowedMentions: { parse: [] }
    })
    return
  }

  context.application.usersManager.verification.addInferenceLink(user.id, mojangProfile.id)
  await interaction.editReply({
    embeds: [
      {
        title: `Set an Alias`,
        description: `Set an alias \`${mojangProfile.name}\` for <@${user.id}>`,
        color: Color.Good,
        fields: [
          { name: 'User', value: `<@${user.id}>` },
          { name: 'username', value: `\`${mojangProfile.name}\`` },
          { name: 'UUID', value: `\`${mojangProfile.id}\`` }
        ],
        footer: { text: DefaultCommandFooter }
      }
    ],
    allowedMentions: { parse: [] }
  })
}

async function handleUnlinkMinecraft(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const username: string = interaction.options.getString('username', true)

  const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
  if (mojangProfile === undefined) {
    await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
    return
  }

  const count = context.application.usersManager.verification.invalidate({ uuid: mojangProfile.id })
  await (count > 0 ? interaction.editReply('Successfully unlinked!') : interaction.editReply('Nothing to unlink!'))
}

async function handleUnlinkDiscord(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const user = interaction.options.getUser('user', true)
  const count = context.application.usersManager.verification.invalidate({ discordId: user.id })
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

  const link = await context.application.usersManager.verification.findByIngame(mojangProfile.id)
  await interaction.editReply({
    embeds: [await formatLink(context.application.mojangApi, link, `\`${mojangProfile.name}\``)]
  })
}

async function handleQueryDiscord(context: Readonly<DiscordCommandContext>) {
  const interaction = context.interaction
  await interaction.deferReply()

  const user = interaction.options.getUser('user', true)
  const link = await context.application.usersManager.verification.findByDiscord(user.id)
  await interaction.editReply({ embeds: [await formatLink(context.application.mojangApi, link, `<@${user.id}>`)] })
}

async function formatLink(mojangApi: MojangApi, link: Link, displayName: string): Promise<APIEmbed> {
  const fields: APIEmbedField[] = []

  let description: string
  if (link.type === LinkType.None) {
    description = `${displayName} has no links`
  } else {
    if (link.type === LinkType.Confirmed) {
      description = 'User has a **CONFIRMED** link.'

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (link.type === LinkType.Inference) {
      description = 'User has an **ALIAS** link.'
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`unknown link type. given=${link}`)
    }

    fields.push({ name: 'user', value: `<@${link.link.discordId}>` })
    const mojangProfile = await mojangApi.profileByUuid(link.link.uuid).catch(() => undefined)

    if (mojangProfile !== undefined) fields.push({ name: 'username', value: `\`${mojangProfile.name}\`` })
    fields.push({ name: 'uuid', value: `\`${link.link.uuid}\`` })
  }

  return {
    title: 'Link Status',
    description: description,
    fields: fields,
    color: Color.Default,
    footer: { text: DefaultCommandFooter }
  }
}
