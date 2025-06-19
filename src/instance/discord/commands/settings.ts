import assert from 'node:assert'

import type { APIEmbed, APIEmbedField, ButtonInteraction, InteractionResponse, Message } from 'discord.js'
import {
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  italic,
  MessageFlags,
  SlashCommandBuilder,
  TextInputStyle
} from 'discord.js'

import type Application from '../../../application.js'
import { type ApplicationEvents, Color, InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandScope } from '../../../common/commands.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { Timeout } from '../../../util/timeout.js'
// eslint-disable-next-line import/no-restricted-paths
import type { ProxyConfig } from '../../minecraft/common/config.js'
// eslint-disable-next-line import/no-restricted-paths
import { ProxyProtocol } from '../../minecraft/common/config.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type { CategoryOption, EmbedCategoryOption } from '../util/options-handler.js'
import { InputStyle, OptionsHandler, OptionType } from '../util/options-handler.js'

const Essential = ':shield:'
const Recommended = ':beginner:'
const Warning = ':warning:'

const CategoryLabel =
  `Options marked with ${Essential} are Essential. Disable at your own risk.\n` +
  `Options marked with ${Recommended} are recommended for quality of life.\n` +
  `Options marked with ${Warning} are only to be messed with if you know what you are doing.\n` +
  `Check [the documentations](https://github.com/aidn3/hypixel-guild-discord-bridge/blob/4.0-pre1/docs/FEATURES.md#available-plugins) for more information.`

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('settings').setDescription('Control application settings.'),
  permission: Permission.Admin,
  scope: CommandScope.Anywhere,

  handler: async function (context) {
    const options: EmbedCategoryOption = {
      type: OptionType.EmbedCategory,
      name: 'Main',
      description:
        'Welcome to Application options!\n' +
        'You can choose one of the below categories to expand.\n\n' +
        CategoryLabel,

      options: [
        {
          type: OptionType.Label,
          name: 'Admins',
          description:
            'Users who have admin permission on the application. Check `/help` for all commands admins can use.',
          getOption: () =>
            context.application.discordInstance
              .getStaticConfig()
              .adminIds.map((adminId) => `<@${adminId}>`)
              .join(', ')
        },
        fetchGeneralOptions(context.application),
        fetchDiscordOptions(context.application),
        fetchMinecraftOptions(context.application),
        fetchModerationOptions(context.application),
        fetchQualityOptions(context.application),
        fetchMetricsOptions(context.application),
        fetchCommandsOptions(context.application),
        fetchLanguageOptions(context.application)
      ]
    }

    const optionsHandler = new OptionsHandler(options)
    await optionsHandler.forwardInteraction(context.interaction, context.errorHandler)
  }
} satisfies DiscordCommandHandler

function fetchGeneralOptions(application: Application): CategoryOption {
  const plugins = application.pluginsManager.getConfig()

  return {
    type: OptionType.Category,
    name: 'General',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Boolean,
        name: `Auto Restart ${Recommended}`,
        description: 'Schedule restarting every 24 hours.',
        getOption: () => plugins.data.autoRestart,
        toggleOption: () => {
          plugins.data.autoRestart = !plugins.data.autoRestart
          plugins.markDirty()
        }
      }
    ]
  }
}

function fetchModerationOptions(application: Application): CategoryOption {
  const moderation = application.moderation.getConfig()

  return {
    type: OptionType.Category,
    name: 'Moderation',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.EmbedCategory,
        name: `Heat Punishments`,
        options: [
          {
            type: OptionType.Boolean,
            name: `Enable Heat Punishment ${Essential}`,
            description: 'Enable to set limits to the amount of actions staff can take before being blocked.',
            getOption: () => moderation.data.heatPunishment,
            toggleOption: () => {
              moderation.data.heatPunishment = !moderation.data.heatPunishment
              moderation.markDirty()
            }
          },
          {
            type: OptionType.Number,
            name: 'Kicks Per Day',
            description: 'Allowed kicks per Day for staff before they are blocked from doing any more.',

            min: 0,
            max: 100,
            getOption: () => moderation.data.kicksPerDay,
            setOption: (value) => {
              moderation.data.kicksPerDay = value
              moderation.markDirty()
            }
          },
          {
            type: OptionType.Number,
            name: 'Mutes Per Day',
            description: 'Allowed mutes per Day for staff before they are blocked from doing any more.',

            min: 0,
            max: 100,
            getOption: () => moderation.data.mutesPerDay,
            setOption: (value) => {
              moderation.data.mutesPerDay = value
              moderation.markDirty()
            }
          }
        ]
      },
      {
        type: OptionType.EmbedCategory,
        name: 'Immunity List',
        description: 'Users who are completely immuneDiscordUsers to heat punishments (Use at your own risk!)',
        options: [
          {
            type: OptionType.User,
            name: 'Immune Discord Users',
            min: 0,
            max: 10,
            getOption: () => moderation.data.immuneDiscordUsers,
            setOption: (values) => {
              moderation.data.immuneDiscordUsers = values
              moderation.markDirty()
            }
          },
          {
            type: OptionType.List,
            name: 'Immune Mojang Players',
            style: InputStyle.Short,
            min: 0,
            max: 10,
            getOption: () => moderation.data.immuneMojangPlayers,
            setOption: (values) => {
              moderation.data.immuneMojangPlayers = values
              moderation.markDirty()
            }
          }
        ]
      },
      {
        type: OptionType.EmbedCategory,
        name: `Profanity Filter`,
        options: [
          {
            type: OptionType.Boolean,
            name: `Profanity Filter ${Essential}`,
            description: 'Enable to filter and censor users chat messages of any profanity.',
            getOption: () => moderation.data.profanityEnabled,
            toggleOption: () => {
              moderation.data.profanityEnabled = !moderation.data.profanityEnabled
              moderation.markDirty()
            }
          },
          {
            type: OptionType.Label,
            name: 'Profanity List',
            description: 'Use command `/profanity` to fine tune the list.',
            getOption: undefined
          }
        ]
      }
    ]
  }
}

function fetchQualityOptions(application: Application): CategoryOption {
  const plugins = application.pluginsManager.getConfig()
  const minecraft = application.minecraftManager.getConfig()

  return {
    type: OptionType.Category,
    name: 'Quality Of Life',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Boolean,
        name: 'Darkauction Reminder',
        description: 'Send a reminder when a skyblock dark auction is starting.',
        getOption: () => plugins.data.darkAuctionReminder,
        toggleOption: () => {
          plugins.data.darkAuctionReminder = !plugins.data.darkAuctionReminder
          plugins.markDirty()
        }
      },
      {
        type: OptionType.Boolean,
        name: 'Starfall Cult Reminder',
        description: 'Send a reminder when the skyblock starfall cult gathers.',
        getOption: () => plugins.data.starfallCultReminder,
        toggleOption: () => {
          plugins.data.starfallCultReminder = !plugins.data.starfallCultReminder
          plugins.markDirty()
        }
      },
      {
        type: OptionType.EmbedCategory,
        name: 'Guild Reaction',
        description: 'Auto replying and reacting to various in-game guild events.',
        options: [
          {
            type: OptionType.Boolean,
            name: 'Guild Join Reaction',
            description: 'Send a greeting message when a member joins the guild.',
            getOption: () => minecraft.data.joinGuildReaction,
            toggleOption: () => {
              minecraft.data.joinGuildReaction = !minecraft.data.joinGuildReaction
              minecraft.markDirty()
            }
          },
          {
            type: OptionType.Boolean,
            name: 'Guild Leave Reaction',
            description: 'Send a reaction message when a member leaves the guild.',
            getOption: () => minecraft.data.leaveGuildReaction,
            toggleOption: () => {
              minecraft.data.leaveGuildReaction = !minecraft.data.leaveGuildReaction
              minecraft.markDirty()
            }
          },
          {
            type: OptionType.Boolean,
            name: 'Guild Kick Reaction',
            description: 'Send a reaction message when a member is kicked from the guild.',
            getOption: () => minecraft.data.kickGuildReaction,
            toggleOption: () => {
              minecraft.data.kickGuildReaction = !minecraft.data.kickGuildReaction
              minecraft.markDirty()
            }
          }
        ]
      }
    ]
  }
}

function fetchDiscordOptions(application: Application): CategoryOption {
  const discord = application.discordInstance.getConfig()
  const leaderboard = application.discordInstance.leaderboard.getConfig()
  const deleterConfig = application.discordInstance.getDeleterConfig()

  return {
    type: OptionType.Category,
    name: 'Discord',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Channel,

        name: `Public Channels ${Essential}`,
        description: 'Manage public channels',

        min: 0,
        max: 5,

        getOption: () => discord.data.publicChannelIds,
        setOption: (values) => {
          discord.data.publicChannelIds = values
          discord.markDirty()
        }
      },
      {
        type: OptionType.Boolean,
        name: 'Always Reply',
        description:
          'Enable to always send a text reply instead of reactions when a problem occurs when sending a discord user message.',
        getOption: () => discord.data.alwaysReplyReaction,
        toggleOption: () => {
          discord.data.alwaysReplyReaction = !discord.data.alwaysReplyReaction
          discord.markDirty()
        }
      },
      {
        type: OptionType.Boolean,
        name: 'Enforce Verification',
        description: 'Enable to always require verification via `/verify` to chat in the application.',
        getOption: () => discord.data.enforceVerification,
        toggleOption: () => {
          discord.data.enforceVerification = !discord.data.enforceVerification
          discord.markDirty()
        }
      },
      {
        type: OptionType.Category,
        name: 'Leaderboards',
        description: 'How leaderboards are displayed.',
        header:
          '**These events are recommended for best user experience.**\n' +
          'Do not turn off any unless you know what you are doing.\n\n' +
          CategoryLabel,
        options: [
          {
            type: OptionType.Number,
            name: `Update Frequency (In Minutes)`,
            description:
              'How frequent to update the displayed leaderboards. WARNING: Fast update might introduce instability!',
            min: 1,
            max: 43_200,
            getOption: () => leaderboard.data.updateEveryMinutes,
            setOption: (value) => {
              leaderboard.data.updateEveryMinutes = value
              leaderboard.markDirty()
            }
          }
        ]
      },
      {
        type: OptionType.Category,
        name: 'Minecraft Events',
        description: 'Advanced options for fine tuning public chat channels.',
        header:
          '**These events are recommended for best user experience.**\n' +
          'Do not turn off any unless you know what you are doing.\n\n' +
          CategoryLabel,
        options: [
          {
            type: OptionType.Boolean,
            name: `Member Online ${Recommended}`,
            description:
              'Show a temporarily message in the designated public discord channels when a guild member comes online.',
            getOption: () => discord.data.guildOnline,
            toggleOption: () => {
              discord.data.guildOnline = !discord.data.guildOnline
              discord.markDirty()
            }
          },
          {
            type: OptionType.Boolean,
            name: `Member Offline ${Recommended}`,
            description:
              'Show a temporarily message in the designated public discord channels when a guild member goes offline.',
            getOption: () => discord.data.guildOffline,
            toggleOption: () => {
              discord.data.guildOffline = !discord.data.guildOffline
              discord.markDirty()
            }
          },
          {
            type: OptionType.Number,
            name: 'Delete Temporarily Events After (In Seconds)',
            description: 'Temporarily events are `Online` and `Offline` events.',
            min: 1,
            max: 43_200,
            getOption: () => deleterConfig.data.expireSeconds,
            setOption: (value) => {
              deleterConfig.data.expireSeconds = value
              deleterConfig.markDirty()
            }
          },
          {
            type: OptionType.Number,
            name: 'Max Temporarily Events',
            description: 'How many to keep in a channel before starting to delete the older ones.',
            min: 1,
            max: 1000,
            getOption: () => deleterConfig.data.maxInteractions,
            setOption: (value) => {
              deleterConfig.data.maxInteractions = value
              deleterConfig.markDirty()
            }
          }
        ]
      },
      {
        type: OptionType.Category,
        name: 'Staff Options',
        description: 'Assign staff channels and roles, so the application can integrate with them.',
        header: 'These are dangerous permissions. Make sure you know what you are doing!',
        options: [
          {
            type: OptionType.Channel,

            name: 'Officer Channels',
            description: 'Manage officer channels',

            min: 0,
            max: 5,

            getOption: () => discord.data.officerChannelIds,
            setOption: (values) => {
              discord.data.officerChannelIds = values
              discord.markDirty()
            }
          },
          {
            type: OptionType.Channel,

            name: 'Logs Channels',
            description: 'Channels where application logs are sent. This is for staff only!',

            min: 0,
            max: 5,

            getOption: () => discord.data.loggerChannelIds,
            setOption: (values) => {
              discord.data.loggerChannelIds = values
              discord.markDirty()
            }
          },
          {
            type: OptionType.Role,

            name: 'Helper Roles',
            description: 'Staff roles that have permissions to do commands such as `!toggle` and `/invite`',

            min: 0,
            max: 5,

            getOption: () => discord.data.helperRoleIds,
            setOption: (values) => {
              discord.data.helperRoleIds = values
              discord.markDirty()
            }
          },
          {
            type: OptionType.Role,

            name: 'Officer Roles',
            description: 'Staff roles that have permissions to do destructive commands such as `/kick`.',

            min: 0,
            max: 5,

            getOption: () => discord.data.officerRoleIds,
            setOption: (values) => {
              discord.data.officerRoleIds = values
              discord.markDirty()
            }
          }
        ]
      }
    ]
  }
}

function fetchMetricsOptions(application: Application): CategoryOption {
  const scoresManager = application.usersManager.scoresManager.config

  return {
    type: OptionType.Category,
    name: 'Metrics',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Number,
        name: `Messages Persistence (In Days)`,
        description:
          'How long to keep records of members messages stats. WARNING: High persistence will increase storage usage and might introduce lags.',
        min: 1,
        max: 1068,
        getOption: () => scoresManager.data.deleteMessagesOlderThan,
        setOption: (value) => {
          scoresManager.data.deleteMessagesOlderThan = value
          scoresManager.markDirty()
        }
      },
      {
        type: OptionType.Number,
        name: `Members Persistence (In Days)`,
        description:
          'How long to keep records of members being in the guild or online, etc. WARNING: High persistence will increase storage usage and might introduce lags.',
        min: 1,
        max: 1068,
        getOption: () => scoresManager.data.deleteMembersOlderThan,
        setOption: (value) => {
          scoresManager.data.deleteMembersOlderThan = value
          scoresManager.markDirty()
        }
      }
    ]
  }
}

function fetchCommandsOptions(application: Application): CategoryOption {
  const minecraft = application.minecraftManager.getConfig()
  const commands = application.commandsInstance.getConfig()

  return {
    type: OptionType.Category,
    name: 'Chat Commands',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Boolean,
        name: `Enable Chat Commands ${Recommended}`,
        description: 'Enable commands such as `!cata` and `!iq`',
        getOption: () => commands.data.enabled,
        toggleOption: () => {
          commands.data.enabled = !commands.data.enabled
          commands.markDirty()
        }
      },
      {
        type: OptionType.Label,
        name: 'Admin Username',
        description: 'You can change admin username from **Minecraft** category.',
        getOption: () => minecraft.data.adminUsername
      },
      {
        type: OptionType.Label,
        name: 'Disabled Chat Commands',
        description: 'This can only be changed via `!toggle`.',
        getOption: () =>
          commands.data.disabledCommands.length === 0 ? 'none' : commands.data.disabledCommands.join(', ')
      }
    ]
  }
}

function fetchLanguageOptions(application: Application): CategoryOption {
  const language = application.language

  return {
    type: OptionType.Category,
    name: 'Language',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.Text,
        name: 'Dark Auction Reminder',
        description: 'Send a reminder when a skyblock dark auction is starting.',
        style: InputStyle.Long,
        min: 2,
        max: 150,
        getOption: () => language.data.darkAuctionReminder,
        setOption: (value) => {
          language.data.darkAuctionReminder = value
          language.markDirty()
        }
      },
      {
        type: OptionType.Text,
        name: 'Starfall Cult Reminder',
        description: 'Send a reminder when the skyblock starfall cult gathers.',
        style: InputStyle.Long,
        min: 2,
        max: 150,
        getOption: () => language.data.starfallReminder,
        setOption: (value) => {
          language.data.starfallReminder = value
          language.markDirty()
        }
      },
      {
        type: OptionType.List,
        name: 'Join Message List',
        description: 'Send a greeting message when a member joins the guild.',
        style: InputStyle.Long,
        min: 0,
        max: 20,
        getOption: () => language.data.guildJoinReaction,
        setOption: (values) => {
          language.data.guildJoinReaction = values
          language.markDirty()
        }
      },
      {
        type: OptionType.List,
        name: 'Leave Message List',
        description: 'Send a reaction message when a member leaves the guild.',
        style: InputStyle.Long,
        min: 0,
        max: 20,
        getOption: () => language.data.guildLeaveReaction,
        setOption: (values) => {
          language.data.guildLeaveReaction = values
          language.markDirty()
        }
      },
      {
        type: OptionType.List,
        name: 'Kick Message List',
        description: 'Send a reaction message when a member is kicked from the guild.',
        style: InputStyle.Long,
        min: 0,
        max: 20,
        getOption: () => language.data.guildKickReaction,
        setOption: (values) => {
          language.data.guildKickReaction = values
          language.markDirty()
        }
      }
    ]
  }
}

function fetchMinecraftOptions(application: Application): CategoryOption {
  const minecraft = application.minecraftManager.getConfig()
  const sanitizer = application.minecraftManager.sanitizer.getConfig()

  return {
    type: OptionType.Category,
    name: 'Minecraft',
    header: CategoryLabel,
    options: [
      {
        type: OptionType.EmbedCategory,
        name: 'Staff Options',
        description: 'These are dangerous permissions. Make sure you know what you are doing!',
        options: [
          {
            type: OptionType.Text,

            name: 'Admin Username',
            description: 'In-game username of the person who has full permission over the application.',

            style: InputStyle.Tiny,
            max: 16,
            min: 2,

            getOption: () => minecraft.data.adminUsername,
            setOption: (username) => {
              minecraft.data.adminUsername = username
              minecraft.markDirty()
            }
          }
        ]
      },
      {
        type: OptionType.Category,
        name: 'Chat Processing',
        description: 'Fine tune how chat messages are sent to the game.',
        header: 'Fine tune how chat messages are sent to the game.\n\n' + CategoryLabel,
        options: [
          {
            type: OptionType.EmbedCategory,
            name: 'Links Processor',
            description: 'How to handle links sent to Minecraft.',
            options: [
              {
                type: OptionType.Boolean,
                name: 'STuF',
                description:
                  'Bypass Hypixel restriction on hyperlinks using STuF encoding. Only use if you know what is STuF!',
                getOption: () => sanitizer.data.hideLinksViaStuf,
                toggleOption: () => {
                  sanitizer.data.hideLinksViaStuf = !sanitizer.data.hideLinksViaStuf
                  sanitizer.markDirty()
                }
              },
              {
                type: OptionType.Boolean,
                name: `Resolve Links ${Recommended}`,
                description: 'Try resolving the link content like `(video)` instead of showing generic `(link)`. ',
                getOption: () => sanitizer.data.resolveHideLinks,
                toggleOption: () => {
                  sanitizer.data.resolveHideLinks = !sanitizer.data.resolveHideLinks
                  sanitizer.markDirty()
                }
              }
            ]
          },
          {
            type: OptionType.EmbedCategory,
            name: 'Anti Spam',
            description: 'Techniques used to avoid messages being blocked for "can not repeat".',
            options: [
              {
                type: OptionType.Boolean,
                name: `Enable Antispam ${Essential}`,
                description:
                  'Use techniques to avoid hypixel blocking a message for "`You cannot say the same message twice!`".',
                getOption: () => sanitizer.data.antispamEnabled,
                toggleOption: () => {
                  sanitizer.data.antispamEnabled = !sanitizer.data.antispamEnabled
                  sanitizer.markDirty()
                }
              },
              {
                type: OptionType.Number,
                name: 'Max Additions',
                description: 'How many letters to add at most to combat anti spam.',
                min: 1,
                max: 100,
                getOption: () => sanitizer.data.antispamMaxAdditions,
                setOption: (value) => {
                  sanitizer.data.antispamMaxAdditions = value
                  sanitizer.markDirty()
                }
              }
            ]
          }
        ]
      },
      {
        type: OptionType.EmbedCategory,
        name: 'Instances',
        options: [
          {
            type: OptionType.Action,

            name: 'Instances Status',
            description: 'Fetch Minecraft instances status.',
            label: 'fetch',
            style: ButtonStyle.Primary,

            onInteraction: (interaction) => minecraftInstancesStatus(application, interaction)
          },
          {
            type: OptionType.Action,

            name: 'Instance Add',
            description: 'Add a Minecraft instance.',
            label: 'add',
            style: ButtonStyle.Success,

            onInteraction: (interaction, errorHandler) => minecraftInstanceAdd(application, interaction, errorHandler)
          },
          {
            type: OptionType.Action,

            name: 'Instance Remove',
            description: 'Remove a Minecraft instance.',
            label: 'remove',
            style: ButtonStyle.Danger,

            onInteraction: (interaction, errorHandler) =>
              minecraftInstanceRemove(application, interaction, errorHandler)
          }
        ]
      }
    ]
  }
}

async function minecraftInstancesStatus(application: Application, interaction: ButtonInteraction): Promise<boolean> {
  const config = application.minecraftManager.getConfig().data
  const instances = application.minecraftManager.getAllInstances()

  const embed: APIEmbed = {
    title: 'Minecraft Status',
    fields: [],
    footer: {
      text: DefaultCommandFooter
    }
  }
  assert(embed.fields)

  const registeredInstances = instances.filter((instance) =>
    config.instances.some((configInstance) => instance.instanceName === configInstance.name)
  )
  embed.fields.push({
    name: 'Registered Instances',
    value:
      registeredInstances.length > 0
        ? registeredInstances
            .map((instance) => `- **${instance.instanceName}:** ${instance.currentStatus()}`)
            .join('\n')
        : '(none registered)'
  } satisfies APIEmbedField)

  const dynamicInstances = instances.filter(
    (instance) => !config.instances.some((configInstance) => instance.instanceName === configInstance.name)
  )
  if (dynamicInstances.length > 0) {
    embed.fields.push({
      name: 'Dynamic Instances',
      value: dynamicInstances
        .map((instance) => `- **${instance.instanceName}:** ${instance.currentStatus()}`)
        .join('\n')
    } satisfies APIEmbedField)
  }

  const unavailableInstances = config.instances
    .map((instance) => instance.name)
    .filter((configName) => !instances.some((instance) => instance.instanceName === configName))
  if (unavailableInstances.length > 0) {
    embed.color = Color.Bad
    embed.description =
      '_Unavailable minecraft instances detected in settings._\n' +
      '_Those instances are registered in settings but not loaded into application._\n' +
      '_This should not happen. Restart the application and check console logs for the reason for this behaviour._'

    embed.fields.push({
      name: 'Unavailable Instances',
      value: unavailableInstances.map((name) => `- ${name}`).join('\n')
    } satisfies APIEmbedField)
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  })

  return true
}

async function minecraftInstanceAdd(
  application: Application,
  interaction: ButtonInteraction,
  errorHandler: UnexpectedErrorHandler
): Promise<boolean> {
  await interaction.showModal({
    customId: 'minecraft-instance-add',
    title: `Add Minecraft Instance`,
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            customId: 'instance-name',
            style: TextInputStyle.Short,
            label: 'Name',

            minLength: 1,
            maxLength: 128,
            required: true
          }
        ]
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            customId: 'instance-proxy',
            style: TextInputStyle.Short,
            label: 'Proxy URI (Optional)',
            placeholder: 'socks5://username:password@server.com:1080',

            minLength: 0,
            maxLength: 1024,
            required: false
          }
        ]
      }
    ]
  })

  const modalInteraction = await interaction.awaitModalSubmit({
    time: 300_000,
    filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
  })

  const instanceName = modalInteraction.fields.getTextInputValue('instance-name').trim()
  const proxyOptions = modalInteraction.fields.getTextInputValue('instance-proxy').trim()

  const EmbedTitle = 'Adding new minecraft instance'
  const InitiationTimeout = 30 * 60 * 1000
  type ApplicationListeners<T> = { [P in keyof T]?: T[P] }

  let proxy: ProxyConfig | undefined = undefined
  if (proxyOptions.length > 0) {
    try {
      proxy = parseSocks5(proxyOptions)
    } catch (error: unknown) {
      errorHandler.error('parsing socks5', error)

      await modalInteraction.reply({
        embeds: [
          {
            title: EmbedTitle,
            description: errorMessage(error),
            color: Color.Error,
            footer: {
              text: DefaultCommandFooter
            }
          } satisfies APIEmbed
        ]
      })
      return true
    }
  }

  const embed: APIEmbed = {
    title: EmbedTitle,
    description: '**Progress:**\n'
  }
  assert(embed.description)

  let sendChainPromise: Promise<InteractionResponse | Message> = modalInteraction.deferReply()
  const deferredReply = await sendChainPromise

  const updateEmbed = () => {
    try {
      return deferredReply.edit({ embeds: [embed] })
    } catch (error: unknown) {
      errorHandler.error('updating adding minecraft instance progress', error)
      return sendChainPromise
    }
  }

  const refresher = setTimeout(() => {
    sendChainPromise = sendChainPromise.then(updateEmbed)
  }, 1000)

  const registeredEvents: ApplicationListeners<ApplicationEvents> = {}
  const sleepTimeout = new Timeout<true>(InitiationTimeout)

  registeredEvents.instanceStatus = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- ${event.message}\n`
    refresher.refresh()
  }
  registeredEvents.instanceSignal = (event) => {
    if (!event.targetInstanceName.includes(instanceName)) return

    assert(embed.description)
    embed.description += `- ${event.type} signal has been received received\n`
    refresher.refresh()
  }
  registeredEvents.instanceAnnouncement = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- Instance has been created\n`
    refresher.refresh()
  }
  registeredEvents.instanceMessage = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- ${event.message}\n`
    refresher.refresh()
  }
  registeredEvents.minecraftSelfBroadcast = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- Instance has logged in as ${event.username} (${event.uuid})\n`
    embed.color = Color.Good

    sleepTimeout.resolve(true)
  }

  for (const [name, listener] of Object.entries(registeredEvents)) {
    application.on(name as keyof ApplicationEvents, listener)
  }
  try {
    embed.description += `- Creating a fresh Minecraft instance\n`
    application.minecraftManager.addAndStart({ name: instanceName, proxy: proxy })

    const config = application.minecraftManager.getConfig()
    config.data.instances.push({
      name: instanceName,
      proxy: proxy
    })
    config.save()
    embed.description += `- Instance has been added to settings for future reboot\n`
  } catch (error: unknown) {
    embed.description += `- ERROR: Failed to add minecraft instance. ${errorMessage(error)}\n`
    embed.color = Color.Error
    sleepTimeout.resolve(true)
  }
  await sleepTimeout.wait()

  for (const [name, listener] of Object.entries(registeredEvents)) {
    application.removeListener(name as keyof ApplicationEvents, listener)
  }
  clearTimeout(refresher)
  await sendChainPromise.then(updateEmbed)
  return true
}

async function minecraftInstanceRemove(
  application: Application,
  interaction: ButtonInteraction,
  errorHandler: UnexpectedErrorHandler
): Promise<boolean> {
  await interaction.showModal({
    customId: 'minecraft-instance-remove',
    title: `Remove Minecraft Instance`,
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            customId: 'instance-name',
            style: TextInputStyle.Short,
            label: 'Name',

            minLength: 1,
            maxLength: 128,
            required: true
          }
        ]
      }
    ]
  })

  const modalInteraction = await interaction.awaitModalSubmit({
    time: 300_000,
    filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
  })

  const instanceName = modalInteraction.fields.getTextInputValue('instance-name')
  const deferredReply = await modalInteraction.deferReply()

  const embed = {
    title: 'Remove Minecraft',
    description: `Removing minecraft \`${escapeMarkdown(instanceName)}\`\n\n`,
    color: Color.Default,
    footer: { text: DefaultCommandFooter }
  } satisfies APIEmbed

  try {
    const results = await application.minecraftManager.removeInstance(instanceName)
    embed.color = Color.Good

    if (results.instanceRemoved === 0) {
      embed.description += '- No active instance to be removed.'
    } else if (results.instanceRemoved === 1) {
      embed.description += '- Active instance has been successfully removed.'
    } else {
      embed.description += `- More than one instance have been detected and removed (total: \`${results.instanceRemoved}\`)\`.`
      embed.color = Color.Info
    }
    embed.description += '\n'

    if (results.deletedConfig === 0) {
      embed.description += '- No relevant configuration has been detected to try and delete.'
    } else if (results.deletedConfig === 1) {
      embed.description += '- Relevant configuration has been detected and deleted.'
    } else {
      embed.description += `- More than one configuration has been detected and removed (total: \`${results.deletedConfig}\`)\`.`
      embed.color = Color.Info
    }
    embed.description += '\n'

    if (results.deletedSessionFiles > 0) {
      embed.description += '- Session files have been detected and deleted.'
    }
  } catch (error: unknown) {
    errorHandler.error('removing minecraft instance', error)
    embed.color = Color.Error
    embed.description += italic(
      'An error occurred while trying to remove Minecraft instance\n' +
        'The results are inconclusive.\n' +
        'Check the console logs for further  details\n' +
        'Tread carefully when trying anything else.'
    )
  }

  await deferredReply.edit({ embeds: [embed] })

  return true
}

function parseSocks5(url: string): ProxyConfig {
  /*
  Notice: Regex does not detect escape characters.
  Tested regex:
    socks5://username:password@server.com:1080
    socks5://username:password@server.com
    socks5://username@server.com:1080
    socks5://server.com
    socks5://server.com:1080
   */
  const regex = /^(?<type>socks5):\/\/(?:(?<username>\w+):(?<password>[^@]+)@)?(?<host>[^:]+)(?::(?<port>\d+))?$/gm
  const match = regex.exec(url)

  if (match === null)
    throw new Error('Invalid proxy format. e.g. valid proxy: socks5://username:password@server.com:1080')

  const groups = match.groups as {
    type: ProxyProtocol
    username: string | undefined
    password: string | undefined
    host: string
    port: string | undefined
  }
  assert(match.groups)

  const type = groups.type
  //const username: string | undefined = groups.username
  //const password: string | undefined = groups.password
  const host: string = groups.host
  const port: number = groups.port === undefined ? 1080 : Number.parseInt(groups.port)

  if (type.toLowerCase() !== ProxyProtocol.Socks5.toLowerCase()) {
    throw new Error('invalid proxy type. Only "socks5" is supported.')
  }

  return { host: host, port: port, protocol: type } satisfies ProxyConfig
}

function errorMessage(error: unknown): string {
  if (error === undefined || error === null) return `${error}`

  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return JSON.stringify(error)
}
