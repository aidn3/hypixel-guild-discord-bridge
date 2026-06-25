import assert from 'node:assert'

import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10'
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js'
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  inlineCode,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  TextChannel
} from 'discord.js'

import type Application from '../../../application'
import { Color, Permission } from '../../../common/application-event'
import type { DiscordAutoCompleteContext, DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands'
import { Status } from '../../../common/connectable-instance'
import type { MojangProfile } from '../../../common/user'
import type { HypixelGuild } from '../../../core/hypixel/hypixel-guild'
import {
  addConditionCommand,
  type CommandConditionHandler,
  handleConditionAdd,
  handleConditionList,
  handleConditionRemove,
  handleSuggestConditionsAdd,
  handleSuggestConditionsRemove,
  listConditionCommand,
  removeConditionCommand
} from '../../../instance/discord/common/commands-conditions'
import { formatInvalidUsername } from '../../../instance/discord/common/commands-format'
import { DefaultCommandFooter } from '../../../instance/discord/common/discord-config'
import { interactivePaging } from '../../../instance/discord/utility/discord-pager'
import type { ModalResult } from '../../../instance/discord/utility/modal-options'
import { showModal } from '../../../instance/discord/utility/modal-options'
import type { CategoryOption, PresetListOption } from '../../../instance/discord/utility/options-handler'
import { OptionsHandler, OptionType } from '../../../instance/discord/utility/options-handler'
import { checkChatTriggers, KickChat } from '../../../utility/chat-triggers'
import Duration from '../../../utility/duration'
import { search, searchObjects, sleep } from '../../../utility/shared-utility'
import { StayConditionMode } from '../database'
import type { Database, GuildJoinCondition, GuildRoleCondition, GuildStayCondition, MinecraftGuild } from '../database'
import type { DiscordWaitlistInteraction } from '../discord-waitlist-interaction'

export const DiscordGuildCommand = {
  getCommandBuilder: function () {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const GuildNameOption = () =>
      new SlashCommandStringOption().setName('name').setDescription('in-game guild name').setRequired(true)

    return new SlashCommandBuilder()
      .setName('guild')
      .setDescription('Manage in-game guilds')
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('register')
          .setDescription('register an in-game guild')
          .addStringOption(GuildNameOption().setAutocomplete(true))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('unregister')
          .setDescription('unregister an in-game guild and delete all related data')
          .addStringOption(GuildNameOption().setAutocomplete(true))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('settings')
          .setDescription('Manage settings of a registered guild')
          .addStringOption(GuildNameOption().setAutocomplete(true))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('join-conditions')
          .setDescription('manage conditions to join a specific guild')
          .addSubcommand(listConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(addConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(removeConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('role-conditions')
          .setDescription('manage conditions to set a role in a specific guild')
          .addSubcommand(listConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(addConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(removeConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('waitlist')
          .setDescription('manage guild join waitlist')
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('list')
              .setDescription('list all currently waiting players')
              .addStringOption(GuildNameOption().setAutocomplete(true))
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('add')
              .setDescription('add a player to the waiting list')
              .addStringOption(GuildNameOption().setAutocomplete(true))
              .addStringOption((o) =>
                o.setName('username').setDescription('Username of the player').setAutocomplete(true).setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('remove')
              .setDescription('remove a player from the waiting list')
              .addStringOption(GuildNameOption().setAutocomplete(true))
              .addStringOption((o) =>
                o.setName('username').setDescription('Username of the player').setAutocomplete(true).setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('create-panel')
              .setDescription('Create a sticky panel that auto updates')
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('stay-conditions')
          .setDescription('manage conditions to stay in a specific guild')
          .addSubcommand(listConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(addConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
          .addSubcommand(removeConditionCommand((c) => c.addStringOption(GuildNameOption().setAutocomplete(true))))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('purge')
          .setDescription('purge guild members who do not meet stay conditions')
          .addStringOption(GuildNameOption().setAutocomplete(true))
      )
  },
  permission: Permission.Officer
} satisfies Omit<DiscordCommandHandler, 'handler' | 'autoComplete'>

export async function discordGuildCommandHandler(
  context: Readonly<DiscordCommandContext>,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
) {
  const interaction = context.interaction
  const groupCommand = interaction.options.getSubcommandGroup() ?? undefined
  const subCommand = interaction.options.getSubcommand()

  if (groupCommand === undefined && subCommand === 'register') {
    await handleRegister(context, database)
  } else if (groupCommand === undefined && subCommand === 'unregister') {
    await handleUnregister(context, database, waitlistInteraction)
  } else if (groupCommand === undefined && subCommand === 'settings') {
    await handleSettings(context, database)
  } else if (groupCommand === 'join-conditions' && subCommand === 'list') {
    await handleJoinConditionList(context, database)
  } else if (groupCommand === 'join-conditions' && subCommand === 'add') {
    await handleJoinConditionAdd(context, database)
  } else if (groupCommand === 'join-conditions' && subCommand === 'remove') {
    await handleJoinConditionRemove(context, database)
  } else if (groupCommand === 'role-conditions' && subCommand === 'list') {
    await handleRoleConditionList(context, database)
  } else if (groupCommand === 'role-conditions' && subCommand === 'add') {
    await handleRoleConditionAdd(context, database)
  } else if (groupCommand === 'role-conditions' && subCommand === 'remove') {
    await handleRoleConditionRemove(context, database)
  } else if (groupCommand === 'waitlist' && subCommand === 'list') {
    await handleWaitlistList(context, database, waitlistInteraction)
  } else if (groupCommand === 'waitlist' && subCommand === 'add') {
    await handleWaitlistAdd(context, database, waitlistInteraction)
  } else if (groupCommand === 'waitlist' && subCommand === 'remove') {
    await handleWaitlistRemove(context, database, waitlistInteraction)
  } else if (groupCommand === 'waitlist' && subCommand === 'create-panel') {
    await handleWaitlistPanel(context, database, waitlistInteraction)
  } else if (groupCommand === 'stay-conditions' && subCommand === 'list') {
    await handleStayConditionList(context, database)
  } else if (groupCommand === 'stay-conditions' && subCommand === 'add') {
    await handleStayConditionAdd(context, database)
  } else if (groupCommand === 'stay-conditions' && subCommand === 'remove') {
    await handleStayConditionRemove(context, database)
  } else if (groupCommand === undefined && subCommand === 'purge') {
    await handlePurge(context, database)
  } else {
    throw new Error('No such command flow found')
  }
}

export async function discordGuildAutocomplete(context: Readonly<DiscordAutoCompleteContext>, database: Database) {
  const interaction = context.interaction
  const groupCommand = interaction.options.getSubcommandGroup() ?? undefined
  const subCommand = interaction.options.getSubcommand()
  const option = context.interaction.options.getFocused(true)

  const suggestRegisteredGuilds =
    (groupCommand === undefined && subCommand === 'unregister' && option.name === 'name') ||
    (groupCommand === undefined && subCommand === 'settings' && option.name === 'name') ||
    (groupCommand === 'join-conditions' && subCommand === 'list' && option.name === 'name') ||
    (groupCommand === 'join-conditions' && subCommand === 'add' && option.name === 'name') ||
    (groupCommand === 'join-conditions' && subCommand === 'remove' && option.name === 'name') ||
    (groupCommand === 'role-conditions' && subCommand === 'list' && option.name === 'name') ||
    (groupCommand === 'role-conditions' && subCommand === 'add' && option.name === 'name') ||
    (groupCommand === 'role-conditions' && subCommand === 'remove' && option.name === 'name') ||
    (groupCommand === 'stay-conditions' && subCommand === 'list' && option.name === 'name') ||
    (groupCommand === 'stay-conditions' && subCommand === 'add' && option.name === 'name') ||
    (groupCommand === 'stay-conditions' && subCommand === 'remove' && option.name === 'name') ||
    (groupCommand === 'waitlist' && subCommand === 'list' && option.name === 'name') ||
    (groupCommand === 'waitlist' && subCommand === 'add' && option.name === 'name') ||
    (groupCommand === 'waitlist' && subCommand === 'remove' && option.name === 'name') ||
    (groupCommand === undefined && subCommand === 'purge' && option.name === 'name')

  if (suggestRegisteredGuilds) {
    const allGuilds = database.allGuilds()
    const response = searchObjects(option.value, allGuilds, (guild) => guild.name)
      .slice(0, 25)
      .map((guild) => ({ name: guild.name, value: guild.id }))
    await context.interaction.respond(response)
    return
  }

  if (groupCommand === 'waitlist' && subCommand === 'remove' && option.name === 'username') {
    const allGuilds = database.allGuilds()
    const profiles = allGuilds
      .flatMap((guild) => database.getWaitlistStatus(guild.id))
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

  if (
    (groupCommand === 'join-conditions' && subCommand === 'add' && option.name === 'type') ||
    (groupCommand === 'role-conditions' && subCommand === 'add' && option.name === 'type') ||
    (groupCommand === 'stay-conditions' && subCommand === 'add' && option.name === 'type')
  ) {
    assert.ok(interaction.inCachedGuild())
    const allHandlers = context.application.core.conditonsRegistry.allHandlers()
    await handleSuggestConditionsAdd(interaction, context, allHandlers)
    return
  }

  if (groupCommand === 'join-conditions' && subCommand === 'remove' && option.name === 'condition') {
    assert.ok(interaction.inCachedGuild())

    const guildId = context.interaction.options.getString('name') ?? undefined
    if (!guildId) return

    const savedGuild = database
      .allGuilds()
      .find((guild) => guild.id === guildId || guild.name.toLowerCase().trim() === guildId.toLowerCase().trim())
    if (savedGuild === undefined) return

    const allHandlers = context.application.core.conditonsRegistry.allHandlers()
    const conditionManager = getJoinConditionManager(savedGuild, database)
    await handleSuggestConditionsRemove(interaction, context, allHandlers, conditionManager)
    return
  }

  if (groupCommand === 'role-conditions' && subCommand === 'remove' && option.name === 'condition') {
    assert.ok(interaction.inCachedGuild())

    const guildId = context.interaction.options.getString('name') ?? undefined
    if (!guildId) return

    const savedGuild = database
      .allGuilds()
      .find((guild) => guild.id === guildId || guild.name.toLowerCase().trim() === guildId.toLowerCase().trim())
    if (savedGuild === undefined) return

    const allHandlers = context.application.core.conditonsRegistry.allHandlers()
    const conditionManager = getRoleConditionManager(savedGuild, context.application, database)
    await handleSuggestConditionsRemove(interaction, context, allHandlers, conditionManager)
    return
  }

  if (groupCommand === 'stay-conditions' && subCommand === 'remove' && option.name === 'condition') {
    assert.ok(interaction.inCachedGuild())

    const guildId = context.interaction.options.getString('name') ?? undefined
    if (!guildId) return

    const savedGuild = database
      .allGuilds()
      .find((guild) => guild.id === guildId || guild.name.toLowerCase().trim() === guildId.toLowerCase().trim())
    if (savedGuild === undefined) return

    const allHandlers = context.application.core.conditonsRegistry.allHandlers()
    const conditionManager = getStayConditionManager(savedGuild, database)
    await handleSuggestConditionsRemove(interaction, context, allHandlers, conditionManager)
    return
  }
}

async function handleRegister(context: DiscordCommandContext, database: Database): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  await interaction.deferReply()

  const name = interaction.options.getString('name', true).trim()
  const guild = await context.application.hypixelApi.getGuildByName(name)
  if (guild === undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: `Registering Guild - ${name}`,
          description: `No such Hypixel guild found: ${inlineCode(name)}`,
          color: Color.Bad,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  let savedGuild = database.allGuilds().find((savedEntry) => savedEntry.id === guild._id)
  if (savedGuild !== undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: `Registering Guild - ${guild.name}`,
          description: `Hypixel guild already registered: ${inlineCode(name)}`,
          color: Color.Bad,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  savedGuild = database.initGuild(
    guild._id,
    guild.name,
    guild.ranks
      .filter((rank) => !rank.default)
      .map((rank) => ({ name: rank.name, priority: rank.priority, whitelisted: false }))
  )
  await interaction.editReply({
    embeds: [
      {
        title: `Registering Guild - ${savedGuild.name}`,
        description: `Hypixel guild has been registered: ${bold(escapeMarkdown(savedGuild.name))}`,
        color: Color.Good,
        footer: { text: DefaultCommandFooter }
      }
    ]
  })
}

async function handleUnregister(
  context: DiscordCommandContext,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context, database)
  if (savedGuild === undefined) return

  const message = await interaction.editReply({
    embeds: [
      {
        title: `Unregistering Guild - ${savedGuild.name}`,
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
          title: `Unregistering Guild - ${savedGuild.name}`,
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

    await waitlistInteraction.notifyBeforeGuildUnregister(savedGuild)
    const totalDeletions = database.deleteGuild(savedGuild.id)
    if (totalDeletions === 0) {
      await message.edit({
        embeds: [
          {
            title: `Unregistering Guild - ${savedGuild.name}`,
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
          title: `Unregistering Guild - ${savedGuild.name}`,
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

async function handleSettings(context: DiscordCommandContext, database: Database): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  let savedGuild = await getGuild(context, database)
  if (savedGuild === undefined) return
  const manager = database

  const options: CategoryOption = {
    type: OptionType.Category,
    name: savedGuild.name,
    description: `Managing the registered guild with the id ${inlineCode(savedGuild.id)}.`,

    options: [
      {
        type: OptionType.EmbedCategory,
        name: 'Guild Ranks',
        description: 'Manage how guild ranks are set and managed.',
        options: [
          {
            type: OptionType.PresetList,
            name: 'Whitelisted guild ranks',
            description: 'Which guild ranks are allowed to change from.',
            min: 0,
            max: 5,
            get options() {
              assert.ok(savedGuild !== undefined)
              return savedGuild.roles.map((role) => ({ label: role.name, value: role.name }))
            },
            getOption: () => {
              assert.ok(savedGuild !== undefined)
              return savedGuild.roles.filter((role) => role.whitelisted).map((role) => role.name)
            },
            setOption: (values) => {
              assert.ok(savedGuild !== undefined)
              manager.setWhitelistedGuildRoles(savedGuild.id, values)
              const refreshed = manager.allGuilds().find((entry) => entry.id === savedGuild?.id)
              assert.ok(refreshed !== undefined)
              savedGuild = refreshed
            }
          }
        ]
      },
      {
        type: OptionType.EmbedCategory,
        name: 'Waitlist',
        description: 'Manage how guild waitlist is operating.',
        options: [
          {
            type: OptionType.Boolean,
            name: 'Allow users to self-signup',
            description:
              'Allow users to use buttons on waitlist panels to signup to the join-waitlist as long as they meet the requirements and do not have any active punishments',
            getOption: () => {
              assert.ok(savedGuild !== undefined)
              return manager.getSelfWaitlistEnabled(savedGuild.id)
            },
            toggleOption: () => {
              assert.ok(savedGuild !== undefined)
              manager.setSelfWaitlistEnabled(savedGuild.id, !manager.getSelfWaitlistEnabled(savedGuild.id))
            }
          },
          {
            type: OptionType.Number,
            name: 'Required join conditions count',
            description:
              'How many conditions must a player meet before they are allowed to join the guild. This will also affect self-signup in waitlist',
            getOption: () => {
              assert.ok(savedGuild !== undefined)
              return manager.getNeededJoinConditions(savedGuild.id)
            },
            min: 1,
            max: 99,
            setOption: (value) => {
              assert.ok(savedGuild !== undefined)
              manager.setNeededJoinConditions(savedGuild.id, value)
            }
          }
        ]
      },
      {
        type: OptionType.EmbedCategory,
        name: 'Purge Settings',
        description: 'Configure how guild purge evaluates members.',
        options: [
          {
            type: OptionType.PresetList,
            name: 'Included Ranks',
            description: 'Which guild ranks are eligible for purge evaluation. Unselected ranks are protected.',
            min: 0,
            max: 25,
            get options() {
              assert.ok(savedGuild !== undefined)
              return savedGuild.roles.map((r) => ({ label: r.name, value: r.name }))
            },
            getOption: () => {
              assert.ok(savedGuild !== undefined)
              return manager.getIncludedPurgeRanks(savedGuild.id)
            },
            setOption: (values) => {
              assert.ok(savedGuild !== undefined)
              manager.setIncludedPurgeRanks(savedGuild.id, values)
            }
          },
          {
            type: OptionType.PresetList,
            name: 'Stay Condition Mode',
            description:
              'How stay conditions are evaluated. ANY = safe if any condition met. ALL = safe only if all conditions met.',
            min: 1,
            max: 1,
            options: [
              { label: 'Any (meet any condition to stay)', value: 'any' },
              { label: 'All (must meet all conditions to stay)', value: 'all' }
            ],
            getOption: () => {
              assert.ok(savedGuild !== undefined)
              return [manager.getStayConditionMode(savedGuild.id)]
            },
            setOption: (values) => {
              assert.ok(savedGuild !== undefined)
              manager.setStayConditionMode(savedGuild.id, values[0] as StayConditionMode)
            }
          }
        ]
      },
      {
        type: OptionType.Boolean,
        name: 'Auto accept join requests',
        description:
          'Auto accept users who send a guild join request as long as they meet the requirements and do not have any active punishments',
        getOption: () => {
          assert.ok(savedGuild !== undefined)
          return manager.getAcceptJoinRequestsEnabled(savedGuild.id)
        },
        toggleOption: () => {
          assert.ok(savedGuild !== undefined)
          manager.setAcceptJoinRequestsEnabled(savedGuild.id, !manager.getAcceptJoinRequestsEnabled(savedGuild.id))
        }
      }
    ]
  }

  const handler = new OptionsHandler(options)
  await handler.forwardInteraction(context.interaction, context.errorHandler)
}

function getJoinConditionManager(savedGuild: MinecraftGuild, database: Database): CommandConditionHandler {
  return {
    conditions: () => database.getJoinConditions(savedGuild.id),
    remove: (id) => database.removeJoinCondition(savedGuild.id, id) !== undefined,
    createOptions: {
      top: [],
      bottom: []
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    add: (handlerId, _: ModalResult, conditionData) => {
      const condition: GuildJoinCondition = {
        guildId: savedGuild.id,
        typeId: handlerId,
        options: conditionData
      }

      return database.addJoinCondition(condition)
    },
    translationKey: 'guild-join'
  }
}

async function handleJoinConditionList(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getJoinConditionManager(savedGuild, database)
  await handleConditionList(interaction, context, manager)
}

async function handleJoinConditionAdd(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getJoinConditionManager(savedGuild, database)
  await handleConditionAdd(interaction, context, manager)
}

async function handleJoinConditionRemove(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getJoinConditionManager(savedGuild, database)
  await handleConditionRemove(interaction, context, manager)
}

function getRoleConditionManager(
  savedGuild: MinecraftGuild,
  application: Application,
  database: Database
): CommandConditionHandler {
  return {
    conditions: () => database.getRoleConditions(savedGuild.id),
    remove: (id) => database.removeRoleCondition(savedGuild.id, id) !== undefined,
    createOptions: {
      top: [
        {
          type: OptionType.PresetList,
          key: 'role',
          name: application.i18n.t(($) => $['discord.conditions.add.guild-role.name']),
          description: application.i18n.t(($) => $['discord.conditions.add.guild-role.description']),
          max: 1,
          min: 1,
          options: savedGuild.roles
            .toSorted((a, b) => a.priority - b.priority)
            .map((role) => ({ label: role.name, value: role.name }))
        }
      ],
      bottom: []
    },
    add: (handlerId, data: ModalResult, conditionData) => {
      const condition: GuildRoleCondition = {
        guildId: savedGuild.id,
        role: (data.role as string[])[0],
        typeId: handlerId,
        options: conditionData
      }

      return database.addRoleCondition(condition)
    },
    translationKey: 'guild-role'
  }
}

async function handleRoleConditionList(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getRoleConditionManager(savedGuild, context.application, database)
  await handleConditionList(interaction, context, manager)
}

async function handleRoleConditionAdd(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getRoleConditionManager(savedGuild, context.application, database)
  await handleConditionAdd(interaction, context, manager)
}

async function handleRoleConditionRemove(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getRoleConditionManager(savedGuild, context.application, database)
  await handleConditionRemove(interaction, context, manager)
}

async function handleWaitlistList(
  context: DiscordCommandContext,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context, database)
  if (savedGuild === undefined) return

  await waitlistInteraction.listWaitlist(interaction, savedGuild)
}

async function handleWaitlistAdd(
  context: DiscordCommandContext,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context, database)
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

  const guild = await context.application.hypixelApi.getGuildByPlayer(mojangProfile.id)
  if (guild?._id === savedGuild.id) {
    await interaction.editReply({ content: `${escapeMarkdown(mojangProfile.name)} already in this guild!` })
    return
  }

  const newlyAdded = database.addWaitlist(savedGuild.id, mojangProfile.id)
  await waitlistInteraction.waitlistUpdated(savedGuild)
  if (newlyAdded) {
    await context.interaction.editReply({
      embeds: [
        {
          title: `Waitlist Add - ${savedGuild.name}`,
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
          title: `Waitlist Add - ${savedGuild.name}`,
          description: `${bold(escapeMarkdown(mojangProfile.name))} already added to the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }
}

async function handleWaitlistRemove(
  context: DiscordCommandContext,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())
  await interaction.deferReply()

  const savedGuild = await getGuild(context, database)
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

  const removed = database.removeWaitlist(savedGuild.id, mojangProfile.id)
  await waitlistInteraction.waitlistUpdated(savedGuild)
  if (removed) {
    await context.interaction.editReply({
      embeds: [
        {
          title: `Waitlist Remove - ${savedGuild.name}`,
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
          title: `Waitlist Remove - ${savedGuild.name}`,
          description: `${bold(escapeMarkdown(mojangProfile.name))} not in the waitlist to join ${bold(escapeMarkdown(savedGuild.name))}.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }
}

async function handleWaitlistPanel(
  context: DiscordCommandContext,
  database: Database,
  waitlistInteraction: DiscordWaitlistInteraction
): Promise<void> {
  const interaction = context.interaction
  const channel = interaction.channel
  if (!interaction.inGuild() || !(channel instanceof TextChannel) || !channel.isSendable()) {
    await interaction.reply({
      content: 'This command can only be used inside a text channel in a Discord server.',
      flags: MessageFlags.Ephemeral
    })
    return
  }

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

  const savedGuilds = database.allGuilds()
  let selectedGuilds: MinecraftGuild[]
  let responseInteraction: ChatInputCommandInteraction | ModalSubmitInteraction = interaction
  if (savedGuilds.length === 0) {
    await interaction.reply({
      content: `You must first </guild register:${interaction.commandId}> before creating any panel.`
    })
    return
  } else if (savedGuilds.length === 1) {
    selectedGuilds = savedGuilds
  } else {
    const option: Omit<PresetListOption, 'getOption' | 'setOption'> & { key: string } = {
      type: OptionType.PresetList,
      key: 'guildIds',
      name: 'Selected Guilds',
      description: 'Which guild to show in the panel',
      max: 6,
      min: 1,
      options: savedGuilds.map((guild) => ({ label: guild.name, value: guild.id }))
    }
    const result = await showModal(interaction, 'Guild Join Waitlist', [option], Duration.minutes(10))
    responseInteraction = result.modalResponse
    const guilds = result.result.guildIds as string[]
    selectedGuilds = savedGuilds.filter((savedGuild) => guilds.includes(savedGuild.id))
  }

  await responseInteraction.deferReply({ flags: MessageFlags.Ephemeral })

  const view = await waitlistInteraction.createView(selectedGuilds)
  const reply = await channel.send(view)
  database.addWaitlistPanel({
    guildIds: selectedGuilds.map((selectedGuild) => selectedGuild.id),
    channelId: channel.id,
    messageId: reply.id
  })

  await responseInteraction.editReply(
    `Message sent: https://discord.com/channels/${reply.guildId}/${reply.channelId}/${reply.id}`
  )
}

function getGuild(context: DiscordCommandContext, database: Database): MinecraftGuild | Promise<undefined> {
  const query = context.interaction.options.getString('name', true).trim()

  const savedGuild = database
    .allGuilds()
    .find((savedEntry) => savedEntry.id === query || savedEntry.name.toLowerCase() === query.toLowerCase())
  if (savedGuild === undefined) {
    const payload = {
      embeds: [
        {
          title: `Waitlist - ${query}`,
          description: `No such a Hypixel guild registered: ${inlineCode(query)}`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    }
    return context.interaction.deferred || context.interaction.replied
      ? context.interaction.editReply(payload).then(() => undefined)
      : context.interaction.reply(payload).then(() => undefined)
  }

  return savedGuild
}

function getStayConditionManager(savedGuild: MinecraftGuild, database: Database): CommandConditionHandler {
  return {
    conditions: () => database.getStayConditions(savedGuild.id),
    remove: (id) => database.removeStayCondition(savedGuild.id, id) !== undefined,
    createOptions: {
      top: [],
      bottom: []
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    add: (handlerId, _: ModalResult, conditionData) => {
      const condition: GuildStayCondition = {
        guildId: savedGuild.id,
        typeId: handlerId,
        options: conditionData
      }

      return database.addStayCondition(condition)
    },
    translationKey: 'guild-stay'
  }
}

async function handleStayConditionList(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getStayConditionManager(savedGuild, database)
  await handleConditionList(interaction, context, manager)
}

async function handleStayConditionAdd(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getStayConditionManager(savedGuild, database)
  await handleConditionAdd(interaction, context, manager)
}

async function handleStayConditionRemove(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  const savedGuild = getGuild(context, database)
  if (savedGuild instanceof Promise) {
    await savedGuild
    return
  }

  const manager = getStayConditionManager(savedGuild, database)
  await handleConditionRemove(interaction, context, manager)
}

async function handlePurge(context: Readonly<DiscordCommandContext>, database: Database) {
  const interaction = context.interaction
  assert.ok(interaction.inCachedGuild())

  await interaction.deferReply()

  const savedGuild = await getGuild(context, database)
  if (savedGuild === undefined) return

  let instanceName: string | undefined
  for (const instance of context.application.minecraftManager.getAllInstances()) {
    if (instance.currentStatus() !== Status.Connected) continue
    try {
      const guildData = await context.application.core.guildManager.list(instance.instanceName)
      if (guildData.name.toLowerCase() === savedGuild.name.toLowerCase()) {
        instanceName = instance.instanceName
        break
      }
    } catch {
      // Ignore
    }
  }

  if (instanceName === undefined) {
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description: `Could not find a connected Minecraft instance for guild **${savedGuild.name}**.`,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const instance = context.application.minecraftManager
    .getAllInstances()
    .find((index) => index.instanceName === instanceName)
  const botUuid = instance?.uuid()

  if (!botUuid) {
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description: `Could not determine the UUID for the instance **${instanceName}** (Guild: **${savedGuild.name}**).`,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  let hypixelGuild: HypixelGuild | undefined
  try {
    hypixelGuild = await context.application.hypixelApi.getGuildByPlayer(botUuid)
  } catch (error: unknown) {
    context.errorHandler.error('fetching hypixel guild', error)
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description: `Failed to fetch guild data for guild **${savedGuild.name}** from Hypixel API due to a connection error.`,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  if (!hypixelGuild) {
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description: `Failed to fetch guild data for guild **${savedGuild.name}** from Hypixel API. The guild may have disbanded or does not exist.`,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const includedRanks = database.getIncludedPurgeRanks(savedGuild.id)
  const stayConditionMode = database.getStayConditionMode(savedGuild.id)
  const stayConditions = database.getStayConditions(savedGuild.id)

  if (includedRanks.length === 0) {
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description:
            `No guild ranks are configured for purge evaluation in guild **${savedGuild.name}**. Running a purge now would protect all members.\n\n` +
            '**Guidance:**\n' +
            '1. Run `/guild settings`.\n' +
            '2. Navigate to **Purge Settings**.\n' +
            '3. Select the ranks to include in **Included Ranks**.',
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  if (stayConditions.length === 0) {
    await interaction.editReply({
      embeds: [
        {
          title: `Purge Failed - ${savedGuild.name}`,
          color: Color.Bad,
          description:
            `No stay conditions are currently configured for guild **${savedGuild.name}**. Running a purge now would evaluate everyone as failing and kick them.\n\n` +
            '**Guidance:**\n' +
            '1. Use `/guild stay-conditions add` to configure at least one condition (e.g., minimum GEXP requirement).\n' +
            '2. Run `/guild stay-conditions list` to verify your active conditions.',
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const botUuids = new Set(context.application.minecraftManager.getMinecraftBots().map((bot) => bot.uuid))
  const totalGuildMembers = hypixelGuild.members.length

  const toKick: { uuid: string; username: string; rank: string; discordId?: string }[] = []

  for (const member of hypixelGuild.members) {
    if (!member.rank || !includedRanks.includes(member.rank)) continue
    if (botUuids.has(member.uuid)) continue

    let username: string
    let profile: MojangProfile
    try {
      profile = await context.application.mojangApi.profileByUuid(member.uuid)
      username = profile.name
    } catch {
      continue
    }

    const handlerUser = {
      user: await context.application.core.initializeMinecraftUser(profile, {}),
      roles: [],
      joinedAt: new Date(member.joined)
    }

    let isSafe = stayConditionMode === StayConditionMode.All

    for (const condition of stayConditions) {
      const handler = context.application.core.conditonsRegistry.get(condition.typeId)

      let conditionMet = true
      if (handler === undefined) {
        // Assume true if handler is missing to prevent accidental purges
        conditionMet = true
      } else {
        try {
          conditionMet = await handler.meetsCondition(
            { application: context.application, startTime: Date.now(), abortSignal: new AbortController().signal },
            handlerUser,
            condition.options
          )
        } catch (error: unknown) {
          context.errorHandler.error(`Error evaluating stay-condition ${condition.typeId} for ${username}`, error)
          conditionMet = true
        }
      }

      if (conditionMet && stayConditionMode === StayConditionMode.Any) {
        isSafe = true
        break
      }
      if (!conditionMet && stayConditionMode === StayConditionMode.All) {
        isSafe = false
        break
      }
    }

    if (!isSafe) {
      toKick.push({ uuid: member.uuid, username, rank: member.rank, discordId: handlerUser.user.discordProfile()?.id })
    }
  }

  if (toKick.length === 0) {
    await interaction.editReply({
      embeds: [
        {
          title: `Nothing To Purge - ${savedGuild.name}`,
          color: Color.Good,
          description: `No members found failing the stay-conditions in included ranks for guild **${savedGuild.name}**.`,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_purge')
    .setLabel('Confirm Purge')
    .setStyle(ButtonStyle.Danger)

  const warnButton = new ButtonBuilder()
    .setCustomId('warn_members')
    .setLabel('Warn Members')
    .setStyle(ButtonStyle.Primary)

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_purge')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, warnButton, cancelButton)

  const pagerAbortController = new AbortController()

  const response = await interactivePaging(
    interaction,
    0,
    120_000,
    context.errorHandler,
    (page) => {
      const EntriesPerPage = 15
      const entries = toKick.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
      const totalPages = Math.ceil(toKick.length / EntriesPerPage)

      const displayList = entries.map((m) => `• **${escapeMarkdown(m.username)}** (${m.rank})`).join('\n')

      return {
        totalPages: totalPages,
        embed: {
          title: `Purge Confirmation - ${savedGuild.name}`,
          color: Color.Info,
          description:
            `**${toKick.length}** out of **${totalGuildMembers}** members in guild **${savedGuild.name}** failed the stay-conditions (Mode: ${stayConditionMode.toUpperCase()}).\n\n` +
            `Members to be kicked (page ${page + 1} of ${Math.max(totalPages, 1)}):\n${displayList}\n\n` +
            `Are you sure you want to execute this purge?`,
          footer: { text: DefaultCommandFooter }
        },
        components: [row]
      }
    },
    pagerAbortController.signal
  )

  try {
    const confirmation = await response.awaitMessageComponent({
      filter: (index) => index.user.id === interaction.user.id,
      time: 120_000,
      componentType: ComponentType.Button
    })

    pagerAbortController.abort()

    if (confirmation.customId === 'cancel_purge') {
      await confirmation.update({
        content: '',
        embeds: [
          {
            title: `Purge Cancelled - ${savedGuild.name}`,
            color: Color.Info,
            description: `The purge operation for guild **${savedGuild.name}** was cancelled.`,
            footer: { text: DefaultCommandFooter }
          }
        ],
        components: []
      })
      return
    }

    if (confirmation.customId === 'warn_members') {
      await confirmation.update({
        content: '',
        embeds: [
          {
            title: `Warning Members - ${savedGuild.name}`,
            color: Color.Info,
            description: `Preparing to send warning DMs to linked members who are failing stay conditions...`,
            footer: { text: DefaultCommandFooter }
          }
        ],
        components: []
      })

      const linkedToWarn = toKick.filter((m) => m.discordId !== undefined)
      let successCount = 0
      let failCount = 0

      const client = context.application.discordInstance.getClient()
      for (const member of linkedToWarn) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const discordUser = await client.users.fetch(member.discordId!)
          const dmChannel = await discordUser.createDM()
          await dmChannel.send(
            `Hello! This is an automated notification regarding the upcoming purge in **${savedGuild.name}** Hypixel guild.\n\n` +
              `You do not currently meet the stay requirements for the guild in the **${interaction.guild.name}** Discord server (specifically, you may not be present in the Discord server, or your account link needs verification).\n\n` +
              `Please ensure you join/remain in the server and that your Minecraft account is properly linked to avoid being removed during the upcoming guild purge.\n\n` +
              `If you have already resolved this or have any questions, please contact a guild/discord admin. Thank you for your cooperation!`
          )
          successCount++
        } catch {
          failCount++
        }
        await sleep(1000)
      }

      await interaction.editReply({
        embeds: [
          {
            title: `Warnings Sent - ${savedGuild.name}`,
            color: Color.Good,
            description: `Warning process complete.\n\n**Successfully warned:** ${successCount} member(s)\n**Failed to warn (e.g. DMs closed):** ${failCount} member(s)\n\nNote: ${toKick.length - linkedToWarn.length} unlinked member(s) were skipped because their Discord accounts are unknown.`,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return
    }

    const cancelPurgeButton = new ButtonBuilder()
      .setCustomId('cancel_active_purge')
      .setLabel('Cancel Active Purge')
      .setStyle(ButtonStyle.Danger)

    const activeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelPurgeButton)

    await confirmation.update({
      content: '',
      embeds: [
        {
          title: `Purge In Progress - ${savedGuild.name}`,
          color: Color.Info,
          description: `Starting to purge **${toKick.length}** members from guild **${savedGuild.name}**...\nQueuing commands...`,
          footer: { text: DefaultCommandFooter }
        }
      ],
      components: [activeRow]
    })
  } catch {
    pagerAbortController.abort()

    await interaction.editReply({
      content: '',
      embeds: [
        {
          title: `Purge Cancelled - ${savedGuild.name}`,
          color: Color.Info,
          description: `Purge confirmation for guild **${savedGuild.name}** timed out.`,
          footer: { text: DefaultCommandFooter }
        }
      ],
      components: []
    })
    return
  }

  const abortController = new AbortController()
  const isAborted = () => abortController.signal.aborted

  const cancelCollector = response.createMessageComponentCollector({
    filter: (click) => click.customId === 'cancel_active_purge' && click.user.id === interaction.user.id,
    time: 120_000 + toKick.length * 15_000,
    max: 1
  })

  cancelCollector.on('collect', (click) => {
    abortController.abort()
    click
      .update({
        content: '',
        embeds: [
          {
            title: `Purge Cancelled - ${savedGuild.name}`,
            color: Color.Info,
            description: `The purge operation for guild **${savedGuild.name}** was cancelled by the user.`,
            footer: { text: DefaultCommandFooter }
          }
        ],
        components: []
      })
      .catch((error: unknown) => {
        context.errorHandler.error('Error updating cancel active purge button response', error)
      })
  })

  const successfulKicks: string[] = []
  const failedKicks: { username: string; reason: string }[] = []
  const kickReason = `Failed stay conditions`

  await sleep(10_000)

  if (isAborted()) {
    return
  }

  let count = 0
  for (const member of toKick) {
    if (isAborted()) {
      break
    }

    const command = `/g kick ${member.username} ${kickReason}`

    const result = await checkChatTriggers(
      context.application,
      context.eventHelper,
      KickChat,
      [instanceName],
      command,
      member.username
    )

    if (result.status === 'success') {
      successfulKicks.push(member.username)
    } else {
      const errorReason = result.message.length > 0 ? result.message[0].content : 'Unknown error / Timeout'
      failedKicks.push({ username: member.username, reason: errorReason })
    }

    count++
    if (count % 5 === 0 || count === toKick.length) {
      if (isAborted()) {
        break
      }
      await interaction.editReply({
        embeds: [
          {
            title: `Purge In Progress - ${savedGuild.name}`,
            color: Color.Info,
            description: `Kicked **${count}/${toKick.length}** members from guild **${savedGuild.name}**...\n\n_Please wait for the process to complete._`,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
    }
  }

  cancelCollector.stop()

  if (isAborted()) {
    return
  }

  let color = Color.Good
  if (failedKicks.length > 0 && successfulKicks.length > 0) color = Color.Info
  if (successfulKicks.length === 0 && failedKicks.length > 0) color = Color.Bad

  const summarySuccess =
    successfulKicks.length > 0
      ? `**Successfully kicked (${successfulKicks.length}):**\n${successfulKicks.join(', ')}`
      : ''
  let summaryFail = ''
  if (failedKicks.length > 0) {
    summaryFail =
      `\n\n**Failed to kick (${failedKicks.length}):**\n` +
      failedKicks.map((f) => `${f.username} - _${f.reason}_`).join('\n')
  }

  let finalDescription = summarySuccess + summaryFail
  if (finalDescription.length > 4000) {
    finalDescription = finalDescription.slice(0, 4000) + '\n\n... (truncated due to length limits)'
  }

  await interaction.editReply({
    content: '',
    embeds: [
      {
        title: `Purge Complete - ${savedGuild.name}`,
        color: color,
        description: finalDescription,
        footer: { text: DefaultCommandFooter }
      }
    ],
    components: []
  })
}
