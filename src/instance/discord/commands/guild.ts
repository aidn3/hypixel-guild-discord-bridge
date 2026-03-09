import assert from 'node:assert'

import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10'
import type { ButtonInteraction } from 'discord.js'
import {
  bold,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  inlineCode,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  TextChannel
} from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import type { MojangProfile } from '../../../common/user'
import type { MinecraftGuild } from '../../../core/minecraft/guilds-manager'
import Duration from '../../../utility/duration'
import { search, searchObjects } from '../../../utility/shared-utility'
import { formatInvalidUsername } from '../common/commands-format'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type { CategoryOption } from '../utility/options-handler'
import { OptionsHandler, OptionType } from '../utility/options-handler'

export default {
  getCommandBuilder: function () {
    return new SlashCommandBuilder()
      .setName('guild')
      .setDescription('Manage in-game guilds')
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('register')
          .setDescription('register an in-game guild')
          .addStringOption((o) => o.setName('name').setDescription('in-game guild name').setRequired(true))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('unregister')
          .setDescription('unregister an in-game guild and delete all related data')
          .addStringOption((o) =>
            o.setName('name').setDescription('in-game guild name').setRequired(true).setAutocomplete(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('settings')
          .setDescription('Manage settings of a registered guild')
          .addStringOption((o) =>
            o.setName('name').setDescription('in-game guild name').setRequired(true).setAutocomplete(true)
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('waitlist')
          .setDescription('manage guild join waitlist')
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('list')
              .setDescription('list all currently waiting players')
              .addStringOption((o) =>
                o.setName('name').setDescription('in-game guild name').setAutocomplete(true).setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('add')
              .setDescription('add a player to the waiting list')
              .addStringOption((o) =>
                o.setName('name').setDescription('in-game guild name').setAutocomplete(true).setRequired(true)
              )
              .addStringOption((o) =>
                o.setName('username').setDescription('Username of the player').setAutocomplete(true).setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('remove')
              .setDescription('remove a player from the waiting list')
              .addStringOption((o) =>
                o.setName('name').setDescription('in-game guild name').setAutocomplete(true).setRequired(true)
              )
              .addStringOption((o) =>
                o.setName('username').setDescription('Username of the player').setAutocomplete(true).setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('create-panel')
              .setDescription('Create a sticky panel that auto updates')
              .addStringOption((o) =>
                o.setName('name').setDescription('in-game guild name').setAutocomplete(true).setRequired(true)
              )
          )
      )
  },
  permission: Permission.Officer,

  handler: async function (context) {
    const interaction = context.interaction
    const groupCommand = interaction.options.getSubcommandGroup() ?? undefined
    const subCommand = interaction.options.getSubcommand()

    if (groupCommand === undefined && subCommand === 'register') {
      await handleRegister(context)
    } else if (groupCommand === undefined && subCommand === 'unregister') {
      await handleUnregister(context)
    } else if (groupCommand === undefined && subCommand === 'settings') {
      await handleSettings(context)
    } else if (groupCommand === 'waitlist' && subCommand === 'list') {
      await handleWaitlistList(context)
    } else if (groupCommand === 'waitlist' && subCommand === 'add') {
      await handleWaitlistAdd(context)
    } else if (groupCommand === 'waitlist' && subCommand === 'remove') {
      await handleWaitlistRemove(context)
    } else if (groupCommand === 'waitlist' && subCommand === 'create-panel') {
      await handleWaitlistPanel(context)
    } else {
      throw new Error('No such command flow found')
    }
  },
  autoComplete: async function (context) {
    const manager = context.application.core.minecraftGuildsManager
    const interaction = context.interaction
    const groupCommand = interaction.options.getSubcommandGroup() ?? undefined
    const subCommand = interaction.options.getSubcommand()
    const option = context.interaction.options.getFocused(true)

    const suggestRegisteredGuilds =
      (groupCommand === undefined && subCommand === 'unregister' && option.name === 'name') ||
      (groupCommand === undefined && subCommand === 'settings' && option.name === 'name') ||
      (groupCommand === 'waitlist' && subCommand === 'list' && option.name === 'name') ||
      (groupCommand === 'waitlist' && subCommand === 'add' && option.name === 'name') ||
      (groupCommand === 'waitlist' && subCommand === 'remove' && option.name === 'name') ||
      (groupCommand === 'waitlist' && subCommand === 'create-panel' && option.name === 'name')

    if (suggestRegisteredGuilds) {
      const allGuilds = manager.allGuilds()
      const response = searchObjects(option.value, allGuilds, (guild) => guild.name)
        .slice(0, 25)
        .map((guild) => ({ name: guild.name, value: guild.id }))
      await context.interaction.respond(response)
      return
    }

    if (groupCommand === 'waitlist' && subCommand === 'remove' && option.name === 'username') {
      const allGuilds = manager.allGuilds()
      const profiles = allGuilds
        .flatMap((guild) => manager.getWaitlist(guild.id))
        .map((entry) => context.application.mojangApi.profileByUuid(entry.mojangId).catch(() => undefined))
      const usernames = await Promise.all(profiles)
        .then((list) => list.filter((entry) => entry !== undefined))
        .then((profiles) => profiles.map((profile) => profile.name))
      const response = search(option.value, usernames)
        .slice(0, 25)
        .map((username) => ({ name: username, value: username }))
      await context.interaction.respond(response)
      return
    }
  }
} satisfies DiscordCommandHandler

async function handleRegister(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  await interaction.deferReply()

  const name = interaction.options.getString('name', true).trim()
  const guild = await context.application.hypixelApi.getGuildByName(name)
  if (guild === undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: 'Registering Guild',
          description: `No such Hypixel guild found: ${inlineCode(name)}`,
          color: Color.Bad,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  let savedGuild = context.application.core.minecraftGuildsManager
    .allGuilds()
    .find((savedEntry) => savedEntry.id === guild._id)
  if (savedGuild !== undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: 'Registering Guild',
          description: `Hypixel guild already registered: ${inlineCode(name)}`,
          color: Color.Bad,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  savedGuild = context.application.core.minecraftGuildsManager.initGuild(guild._id, guild.name)
  await interaction.editReply({
    embeds: [
      {
        title: 'Registering Guild',
        description: `Hypixel guild has been registered: ${bold(escapeMarkdown(savedGuild.name))}`,
        color: Color.Good,
        footer: { text: DefaultCommandFooter }
      }
    ]
  })
}

async function handleUnregister(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return

  const message = await interaction.editReply({
    embeds: [
      {
        title: 'Unregistering Guild',
        description:
          `Hypixel guild ${bold(escapeMarkdown(savedGuild.name))} will be completely unregistered from this application` +
          ` and any related information will be deleted as well.` +
          '\n\nThat means:' +
          '\n- Any custom rank or join condition will be deleted' +
          '\n- Join waitlist will be emptied' +
          '\n- Automated Leaderboards will stop working' +
          '\n\n**THIS ACTION IS IRREVERSIBLE!**',
        color: Color.Info,
        footer: { text: DefaultCommandFooter }
      }
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          { type: ComponentType.Button, customId: 'delete', label: 'DELETE', style: ButtonStyle.Danger },
          { type: ComponentType.Button, customId: 'cancel', label: 'CANCEL', style: ButtonStyle.Primary }
        ]
      }
    ]
  })

  let response: ButtonInteraction | undefined = undefined

  try {
    response = await message.awaitMessageComponent({
      time: Duration.minutes(1).toMilliseconds(),
      componentType: ComponentType.Button,
      filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id
    })
  } catch {
    context.logger.debug(`Deleting guild ${savedGuild.id}/${savedGuild.name} Timed out.`)
    await message.edit({ components: [] })
    return
  }
  assert.ok(response.isButton())

  if (response.customId === 'cancel') {
    await message.edit({
      embeds: [
        {
          title: 'Unregistering Guild',
          description: `Unregistering Hypixel guild ${bold(escapeMarkdown(savedGuild.name))} has been cancelled.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ],
      components: []
    })
    return
  }

  if (response.customId === 'delete') {
    await message.edit({
      content:
        `Deleting has been confirmed and started at <t:${Math.floor(Date.now() / 1000)}>.` +
        '\nIt will take some time to finish...',
      embeds: [],
      components: []
    })

    await context.application.discordInstance.waitlistInteraction.notifyBeforeGuildUnregister(savedGuild)
    const totalDeletions = context.application.core.minecraftGuildsManager.deleteGuild(savedGuild.id)
    if (totalDeletions === 0) {
      await message.edit({
        embeds: [
          {
            title: 'Unregistering Guild',
            description: `Hypixel guild ${bold(escapeMarkdown(savedGuild.name))} has been already been unregistered??.`,
            color: Color.Bad,
            footer: { text: DefaultCommandFooter }
          }
        ],
        content: '',
        components: []
      })
      return
    }

    await message.edit({
      embeds: [
        {
          title: 'Unregistering Guild',
          description:
            `Hypixel guild ${bold(escapeMarkdown(savedGuild.name))} has been successfully unregistered` +
            ` along with ${inlineCode(totalDeletions.toLocaleString('en-US'))} data entry.`,
          color: Color.Good,
          footer: { text: DefaultCommandFooter }
        }
      ],
      content: '',
      components: []
    })
    return
  }

  assert.fail(`unknown customId: ${response.customId}`)
}

async function handleSettings(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return
  const manager = context.application.core.minecraftGuildsManager

  const options: CategoryOption = {
    type: OptionType.Category,
    name: savedGuild.name,
    description: `Managing the registered guild with the id ${inlineCode(savedGuild.id)}.`,

    options: [
      {
        type: OptionType.EmbedCategory,
        name: 'Waitlist',
        description: 'Manage how guild waitlist is operating.',
        options: [
          {
            type: OptionType.Boolean,
            name: 'Allow users to self-signup',
            description:
              'Allow users to use buttons on waitlist panels to auto signup to the join waitlist as long as they meet the requirements and do not have any active punishments',
            getOption: () => manager.getSelfWaitlistEnabled(savedGuild.id),
            toggleOption: () => {
              manager.setSelfWaitlistEnabled(savedGuild.id, !manager.getSelfWaitlistEnabled(savedGuild.id))
            }
          }
        ]
      }
    ]
  }

  const handler = new OptionsHandler(options)
  await handler.forwardInteraction(context.interaction, context.errorHandler)
}

async function handleWaitlistList(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return

  await context.application.discordInstance.waitlistInteraction.listWaitlist(interaction, savedGuild)
}

async function handleWaitlistAdd(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return

  const username = interaction.options.getString('username', true).trim()
  let mojangProfile: MojangProfile
  try {
    mojangProfile = await context.application.mojangApi.profileByUsername(username)
  } catch (error: unknown) {
    context.errorHandler.error('fetching minecraft profile', error)
    await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
    return
  }

  const newlyAdded = context.application.core.minecraftGuildsManager.addWaitlist(savedGuild.id, mojangProfile.id)
  await context.application.discordInstance.waitlistInteraction.waitlistUpdated(savedGuild)
  if (newlyAdded) {
    await context.interaction.editReply({
      embeds: [
        {
          title: 'Waitlist Add',
          description: `${bold(escapeMarkdown(mojangProfile.name))} has been added to the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Good,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  } else {
    await context.interaction.editReply({
      embeds: [
        {
          title: 'Waitlist Add',
          description: `${bold(escapeMarkdown(mojangProfile.name))} already added to the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }
}

async function handleWaitlistRemove(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return

  const username = interaction.options.getString('username', true).trim()
  let mojangProfile: MojangProfile
  try {
    mojangProfile = await context.application.mojangApi.profileByUsername(username)
  } catch (error: unknown) {
    context.errorHandler.error('fetching minecraft profile', error)
    await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
    return
  }

  const removed = context.application.core.minecraftGuildsManager.removeWaitlist(savedGuild.id, mojangProfile.id)
  await context.application.discordInstance.waitlistInteraction.waitlistUpdated(savedGuild)
  if (removed) {
    await context.interaction.editReply({
      embeds: [
        {
          title: 'Waitlist Remove',
          description: `${bold(escapeMarkdown(mojangProfile.name))} has been removed from the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Good,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  } else {
    await context.interaction.editReply({
      embeds: [
        {
          title: 'Waitlist Remove',
          description: `${bold(escapeMarkdown(mojangProfile.name))} not in the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }
}

async function handleWaitlistPanel(context: DiscordCommandContext): Promise<void> {
  const interaction = context.interaction
  const channel = interaction.channel
  if (!interaction.inGuild() || !(channel instanceof TextChannel) || !channel.isSendable()) {
    await interaction.reply({
      content: 'This command can only be used inside a text channel in a Discord server.',
      flags: MessageFlags.Ephemeral
    })
    return
  }

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

  const savedGuild = await getGuild(context)
  if (savedGuild === undefined) return

  const view = await context.application.discordInstance.waitlistInteraction.createView(savedGuild)
  const reply = await channel.send(view)
  context.application.core.minecraftGuildsManager.addWaitlistPanel({
    guildId: savedGuild.id,
    channelId: channel.id,
    messageId: reply.id
  })

  await interaction.editReply(
    `Message sent: https://discord.com/channels/${reply.guildId}/${reply.channelId}/${reply.id}`
  )
}

async function getGuild(context: DiscordCommandContext): Promise<MinecraftGuild | undefined> {
  const query = context.interaction.options.getString('name', true).trim()

  const savedGuild = context.application.core.minecraftGuildsManager
    .allGuilds()
    .find((savedEntry) => savedEntry.id === query || savedEntry.name.toLowerCase() === query.toLowerCase())
  if (savedGuild === undefined) {
    await context.interaction.editReply({
      embeds: [
        {
          title: 'Waitlist',
          description: `No such a Hypixel guild registered: ${inlineCode(query)}`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return undefined
  }

  return savedGuild
}
