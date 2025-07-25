import assert from 'node:assert'

import type { APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import type Application from '../../../application.js'
import type { PunishmentAddEvent, UserIdentifier } from '../../../common/application-event.js'
import {
  Color,
  InstanceType,
  MinecraftSendChatPriority,
  Permission,
  PunishmentType
} from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { checkChatTriggers, KickChat, MuteChat, UnmuteChat } from '../../../utility/chat-triggers.js'
import type { MojangApi } from '../../../utility/mojang.js'
import { durationToMinecraftDuration, getDuration } from '../../../utility/shared-utility'
import { HeatResult, HeatType } from '../../moderation/commands-heat.js'
import type ModerationInstance from '../../moderation/moderation-instance.js'
import { userIdentifiersToList } from '../../moderation/utility'
import { formatChatTriggerResponse } from '../common/chattrigger-format.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { pageMessage } from '../utility/discord-pager.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('punishments')
      .setDescription('Manage active punishments')

      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('ban')
          .setDescription('Add a member to the ban list')
          .addStringOption((option) =>
            option
              .setName('username')
              .setDescription('username of the player to ban')
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('reason to ban the player').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('duration').setDescription('duration of the ban. Can use 1s, 1m, 1h, 1d').setRequired(true)
          )
          .addBooleanOption((option) =>
            option.setName('no-discord').setDescription('Do not check with Discord for similar names')
          )
          .addBooleanOption((option) =>
            option.setName('no-uuid').setDescription('Do not check with Mojang for user UUID')
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('mute')
          .setDescription('Add a member to the mute list')
          .addStringOption((option) =>
            option
              .setName('username')
              .setDescription('username of the player to mute')
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('reason to mute the player').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('duration').setDescription('duration of the mute. Can use 1s, 1m, 1h, 1d').setRequired(true)
          )
          .addBooleanOption((option) =>
            option.setName('no-discord').setDescription('Do not check with Discord for similar names')
          )
          .addBooleanOption((option) =>
            option.setName('no-uuid').setDescription('Do not check with Mojang for user UUID')
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('kick')
          .setDescription('kick a member from all Minecraft instances')
          .addStringOption((option) =>
            option
              .setName('user')
              .setDescription('username or userUuid of the player to kick')
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('reason to kick the player').setRequired(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('forgive')
          .setDescription('forgive a member by removing all active punishments on them')
          .addStringOption((option) =>
            option
              .setName('user')
              .setDescription('username or userUuid or discord-id of the player to forgive')
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addBooleanOption((option) =>
            option.setName('no-discord').setDescription('Do not check with Discord for similar names')
          )
          .addBooleanOption((option) =>
            option.setName('no-uuid').setDescription('Do not check with Mojang for user UUID')
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('check')
          .setDescription('Check a member punishment status')
          .addStringOption((option) =>
            option
              .setName('user')
              .setDescription('username or userUuid or discord-id of the person to check')
              .setRequired(true)
              .setAutocomplete(true)
          )
      )
      .addSubcommand(new SlashCommandSubcommandBuilder().setName('list').setDescription('List all active punishments')),
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    switch (context.interaction.options.getSubcommand()) {
      case 'ban': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        await handleBanAddInteraction(
          context.application,
          context.instanceName,
          context.eventHelper,
          context.interaction
        )
        return
      }
      case 'mute': {
        await handleMuteAddInteraction(
          context.application,
          context.instanceName,
          context.eventHelper,
          context.interaction
        )
        return
      }
      case 'kick': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        await handleKickInteraction(context.application, context.eventHelper, context.interaction)
        return
      }
      case 'list': {
        await handleAllListInteraction(context.application, context.interaction, context.errorHandler)
        return
      }
      case 'forgive': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        await handleForgiveInteraction(
          context.application,
          context.instanceName,
          context.eventHelper,
          context.interaction,
          context.errorHandler
        )
        return
      }
      case 'check': {
        await handleCheckInteraction(context.application, context.interaction, context.errorHandler)
        return
      }
      default: {
        throw new Error('No such command flow found')
      }
    }
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username' || option.name === 'user') {
      const response = context.application.usersManager.autoComplete
        .username(option.value)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function handleBanAddInteraction(
  application: Application,
  instanceName: string,
  eventHelper: EventHelper<InstanceType.Discord>,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const allowance = await handleAllowance(interaction, application.mojangApi, application.moderation, HeatType.Kick)
  if (allowance === 'denied') return

  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('username', true)
  const reason: string = interaction.options.getString('reason', true)
  const duration: string = interaction.options.getString('duration', true)
  const noDiscordCheck = interaction.options.getBoolean('no-discord') ?? false
  const noUuidCheck = interaction.options.getBoolean('no-uuid') ?? false

  const punishDuration = getDuration(duration) * 1000
  const userIdentifiers = await findAboutUser(application.mojangApi, interaction, username, noDiscordCheck, noUuidCheck)

  const event: PunishmentAddEvent = {
    ...eventHelper.fillBaseEvent(),

    userName: userIdentifiers.userName,
    userUuid: userIdentifiers.userUuid,
    userDiscordId: userIdentifiers.userDiscordId,

    type: PunishmentType.Ban,
    reason: reason,
    till: Date.now() + punishDuration
  }

  application.moderation.punishments.add(event)
  const command = `/guild kick ${username} Banned for ${duration}. Reason: ${reason}`
  const instances = application.getInstancesNames(InstanceType.Minecraft)

  const result = await checkChatTriggers(application, eventHelper, KickChat, instances, command, username)
  const formatted = formatChatTriggerResponse(result, `Ban ${escapeMarkdown(username)}`)

  await interaction.editReply({ embeds: [formatPunishmentAdd(event, noUuidCheck), formatted] })
  if (allowance !== 'allow') await interaction.followUp({ embeds: [allowance] })
}

async function handleMuteAddInteraction(
  application: Application,
  instanceName: string,
  eventHelper: EventHelper<InstanceType.Discord>,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const allowance = await handleAllowance(interaction, application.mojangApi, application.moderation, HeatType.Mute)
  if (allowance === 'denied') return

  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('username', true)
  const reason: string = interaction.options.getString('reason', true)
  const duration: string = interaction.options.getString('duration', true)
  const noDiscordCheck = interaction.options.getBoolean('no-discord') ?? false
  const noUuidCheck = interaction.options.getBoolean('no-uuid') ?? false

  const muteDuration = getDuration(duration) * 1000
  const userIdentifiers = await findAboutUser(application.mojangApi, interaction, username, noDiscordCheck, noUuidCheck)

  const event: PunishmentAddEvent = {
    ...eventHelper.fillBaseEvent(),

    userName: userIdentifiers.userName,
    userUuid: userIdentifiers.userUuid,
    userDiscordId: userIdentifiers.userDiscordId,

    type: PunishmentType.Mute,
    reason: reason,
    till: Date.now() + muteDuration
  }

  application.moderation.punishments.add(event)
  const command = `/guild mute ${username} ${durationToMinecraftDuration(muteDuration)}`
  const instances = application.getInstancesNames(InstanceType.Minecraft)

  const result = await checkChatTriggers(application, eventHelper, MuteChat, instances, command, username)
  const formatted = formatChatTriggerResponse(result, `Mute ${escapeMarkdown(username)}`)

  application.emit('minecraftSend', {
    ...eventHelper.fillBaseEvent(),
    targetInstanceName: application.getInstancesNames(InstanceType.Minecraft),
    priority: MinecraftSendChatPriority.High,
    command: `/msg ${username} [AUTOMATED. DO NOT REPLY] Muted for: ${event.reason}`
  })

  await interaction.editReply({ embeds: [formatPunishmentAdd(event, noUuidCheck), formatted] })
  if (allowance !== 'allow') await interaction.followUp({ embeds: [allowance] })
}

async function handleKickInteraction(
  application: Application,
  eventHelper: EventHelper<InstanceType.Discord>,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const allowance = await handleAllowance(interaction, application.mojangApi, application.moderation, HeatType.Kick)
  if (allowance === 'denied') return

  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('user', true)
  const reason: string = interaction.options.getString('reason', true)
  const command = `/guild kick ${username} ${reason}`
  const instances = application.getInstancesNames(InstanceType.Minecraft)

  const result = await checkChatTriggers(application, eventHelper, KickChat, instances, command, username)
  const formatted = formatChatTriggerResponse(result, `Kick ${escapeMarkdown(username)}`)

  await interaction.editReply({
    embeds: [
      {
        color: Color.Good,
        title: 'Punishment Status',
        description: `Kick command has been sent.\nPlease, ensure the player has been kicked.`,
        fields: [
          {
            name: 'Username',
            value: escapeMarkdown(username)
          },
          {
            name: 'reason',
            value: escapeMarkdown(reason)
          }
        ],
        footer: { text: DefaultCommandFooter }
      },
      formatted
    ]
  })
  if (allowance !== 'allow') await interaction.followUp({ embeds: [allowance] })
}

async function handleForgiveInteraction(
  application: Application,
  instanceName: string,
  eventHelper: EventHelper<InstanceType.Discord>,
  interaction: ChatInputCommandInteraction,
  errorHandler: UnexpectedErrorHandler
): Promise<void> {
  const allowance = await handleAllowance(interaction, application.mojangApi, application.moderation, HeatType.Mute)
  if (allowance === 'denied') return

  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('user', true)
  const noDiscordCheck = interaction.options.getBoolean('no-discord') ?? false
  const noUuidCheck = interaction.options.getBoolean('no-uuid') ?? false

  const userResolvedData = await findAboutUser(
    application.mojangApi,
    interaction,
    username,
    noDiscordCheck,
    noUuidCheck
  )
  const userIdentifiers = userIdentifiersToList(userResolvedData)

  const forgivenPunishments = application.moderation.punishments.remove({
    ...eventHelper.fillBaseEvent(),
    userIdentifiers: userIdentifiers
  })

  const command = `/guild unmute ${userResolvedData.userName}`
  const instances = application.getInstancesNames(InstanceType.Minecraft)

  const result = await checkChatTriggers(application, eventHelper, UnmuteChat, instances, command, username)
  const formatted = formatChatTriggerResponse(result, `Unmute/Unban ${escapeMarkdown(username)}`)

  const pages: APIEmbed[] = []
  for (let index = 0; index < forgivenPunishments.length; index++) {
    const description = `__**Page ${index + 1} out of ${forgivenPunishments.length}**__\nPunishment(s) forgiven.`
    pages.push(formatPunishmentStatus(forgivenPunishments[index], description))
  }

  if (pages.length === 0) {
    await interaction.editReply({
      embeds: [
        formatNoPunishmentStatus(userResolvedData.userName, userResolvedData.userUuid, userResolvedData.userDiscordId),
        formatted
      ]
    })
  } else if (pages.length === 1) {
    await interaction.editReply({ embeds: [pages[0], formatted] })
    if (allowance !== 'allow') await interaction.followUp({ embeds: [allowance] })
  } else {
    await pageMessage(interaction, pages, errorHandler)
    await interaction.followUp({ embeds: [formatted] })
  }
}

async function handleAllListInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction,
  errorHandler: UnexpectedErrorHandler
): Promise<void> {
  const list = application.moderation.punishments.all()
  await pageMessage(interaction, formatList(list), errorHandler)
}

async function handleCheckInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction,
  errorHandler: UnexpectedErrorHandler
): Promise<void> {
  const username: string = interaction.options.getString('user', true)
  const userResolvedData = await findAboutUser(application.mojangApi, interaction, username, false, false)
  const userIdentifiers = userIdentifiersToList(userResolvedData)

  const activePunishments = application.moderation.punishments.findByUser(userIdentifiers)

  const pages: APIEmbed[] = []
  for (let index = 0; index < activePunishments.length; index++) {
    const description = `__**Page ${index + 1} out of ${activePunishments.length}**__\nActive Punishments for this user.`
    pages.push(formatPunishmentStatus(activePunishments[index], description))
  }

  await (pages.length > 0
    ? pageMessage(interaction, pages, errorHandler)
    : interaction.editReply({
        embeds: [
          formatNoPunishmentStatus(userResolvedData.userName, userResolvedData.userUuid, userResolvedData.userDiscordId)
        ]
      }))
}

function formatList(list: PunishmentAddEvent[]): APIEmbed[] {
  if (list.length === 0) {
    return [
      {
        color: Color.Info,
        title: `Active Punishments`,
        description: '_There are no active punishments._',
        footer: {
          text: DefaultCommandFooter
        }
      }
    ]
  }

  list = list.sort((a, b) => {
    if (a.type === b.type) return a.till - b.till
    return a.type.localeCompare(b.type)
  })
  const entries: string[] = []

  for (const punishment of list) {
    entries.push(
      `- [${punishment.type}] Expires <t:${Math.floor(punishment.till / 1000)}:R> **${escapeMarkdown(punishment.userName)}**: ${escapeMarkdown(punishment.reason)}\n`
    )
  }

  const pages = []

  const MaxLength = 3900
  let currentLength = 0
  let entriesCount = 0
  for (const entry of entries) {
    if (pages.length === 0 || currentLength + entry.length > MaxLength || entriesCount >= 20) {
      currentLength = 0
      entriesCount = 0

      pages.push({
        color: Color.Default,
        title: `Active Punishments (${list.length}):`,
        description: '',
        footer: {
          text: DefaultCommandFooter
        }
      })
    }

    currentLength += entry.length
    entriesCount++
    const lastPage = pages.at(-1)
    assert.ok(lastPage)
    lastPage.description += entry
  }

  return pages as APIEmbed[]
}

function formatPunishmentAdd(event: PunishmentAddEvent, noUuidCheck: boolean): APIEmbed {
  let description = 'Punishment forwarded to Minecraft \nand the member has been added to the punished list!\n'

  if (event.userDiscordId !== undefined) {
    description +=
      `\n__**Notice: Discord user <@${event.userDiscordId}> seems to have the same name.\n` +
      'The person has been added to the punishment**__\n'
  }

  if (event.userUuid == undefined && !noUuidCheck) {
    description +=
      "\n**__Warning:__** The username doesn't seem to have a Minecraft account associated.\n" +
      'The username itself has been added as it is.\n' +
      'The user can evade in-game punishment if they change their username.\n'
  }

  return formatPunishmentStatus(event, description)
}

function formatPunishmentStatus(event: PunishmentAddEvent, description: string): APIEmbed {
  return {
    color: Color.Good,
    title: 'Punishment Status',
    description: description,
    fields: [
      {
        name: 'Username',
        value: event.userName,
        inline: true
      },
      {
        name: 'UUID',
        value: event.userUuid ? `\`${event.userUuid}\`` : 'None',
        inline: true
      },
      {
        name: 'Discord',
        value: event.userDiscordId ? `<@${event.userDiscordId}>` : 'None',
        inline: true
      },
      {
        name: 'Type',
        value: event.type,
        inline: true
      },
      {
        name: 'Created in',
        value: event.instanceType,
        inline: true
      },
      {
        name: 'Till',
        value: `Expires <t:${Math.floor(event.till / 1000)}:R>`,
        inline: true
      },
      {
        name: 'Reason',
        value: event.reason,
        inline: true
      }
    ],
    footer: {
      text: DefaultCommandFooter
    }
  }
}

function formatNoPunishmentStatus(
  userName: string,
  userUuid: string | undefined,
  discordUserId: string | undefined
): APIEmbed {
  return {
    color: Color.Good,
    title: 'Punishment Status',
    description: 'There is no active punishments for that user.',
    fields: [
      {
        name: 'Username',
        value: userName,
        inline: true
      },
      {
        name: 'UUID',
        value: userUuid ? `\`${userUuid}\`` : 'None',
        inline: true
      },
      {
        name: 'Discord',
        value: discordUserId ? `<@${discordUserId}>` : 'None',
        inline: true
      }
    ],
    footer: { text: DefaultCommandFooter }
  }
}

async function handleAllowance(
  interaction: ChatInputCommandInteraction,
  mojangApi: MojangApi,
  moderation: ModerationInstance,
  type: HeatType
): Promise<'denied' | 'allow' | APIEmbed> {
  const issuerUser = await findAboutUser(mojangApi, interaction, interaction.user.username, false, false)
  if (issuerUser.userUuid !== undefined && moderation.immuneMinecraft(issuerUser.userName)) return 'allow'
  if (moderation.immuneDiscord(interaction.user.id)) return 'allow'

  const actionAllowance = moderation.commandsHeat.tryAdd(issuerUser, type)

  switch (actionAllowance) {
    case HeatResult.Allowed: {
      return 'allow'
    }
    case HeatResult.Warn: {
      return generateHeatWarning()
    }
    case HeatResult.Denied: {
      await handleHeatDenied(interaction)
      return 'denied'
    }
  }
}

function generateHeatWarning(): APIEmbed {
  return {
    title: 'Guild Protection',
    description:
      'You are taking too many actions in a short period.\n' +
      'If you continue, you will be temporarily blocked from taking any more actions.\n' +
      'If you believe the actions you are taking are urgent, contact other staff to do the actions on your behalf.\n' +
      'If the actions you have taken so far are not drastic, ask the bridge admin to increase the limit.',
    color: Color.Info,
    footer: {
      text: DefaultCommandFooter
    }
  } satisfies APIEmbed
}

async function handleHeatDenied(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed: APIEmbed = {
    title: 'Guild Protection',
    description:
      'You have taken too many actions in a short period.\n' +
      'Wait around 24 hours before trying again.\n' +
      'If you believe the actions you are taking are urgent, contact other staff to do the actions on your behalf.\n' +
      'If the actions you have taken so far are not drastic, ask the bridge admin to increase the limit.',
    color: Color.Bad,
    footer: {
      text: DefaultCommandFooter
    }
  }

  await interaction.editReply({ embeds: [embed] })
}

async function findAboutUser(
  mojangApi: MojangApi,
  interaction: ChatInputCommandInteraction,
  username: string,
  noDiscordCheck: boolean,
  noUuidCheck: boolean
): Promise<UserIdentifier> {
  const resultedUser = noDiscordCheck
    ? undefined
    : await interaction.guild?.members
        .search({
          query: username,
          limit: 1
        })
        .then((result) => result.first())
        .catch(() => undefined)

  const mojangProfile = noUuidCheck ? undefined : await mojangApi.profileByUsername(username).catch(() => undefined)

  return {
    userDiscordId: resultedUser?.id,
    userName: mojangProfile?.name ?? username,
    userUuid: mojangProfile?.id
  }
}
