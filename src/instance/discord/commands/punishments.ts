import assert from 'node:assert'

import type { APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from 'discord.js'

import type Application from '../../../application'
import type { PunishmentAddEvent } from '../../../common/application-event'
import { InstanceType, PunishmentType } from '../../../common/application-event'
import type { MojangApi } from '../../../util/mojang'
import { PunishedUsers } from '../../../util/punished-users'
import { escapeDiscord, getDuration } from '../../../util/shared-util'
import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import { ColorScheme, DefaultCommandFooter } from '../common/discord-config'
import { pageMessage } from '../discord-pager'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('punishments')
      .setDescription('Manage active punishments')
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('ban')
          .setDescription('Manage banned members')
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('add')
              .setDescription('Add a member to banned list')
              .addStringOption((option) =>
                option.setName('username').setDescription('username of the player to ban').setRequired(true)
              )
              .addStringOption((option) =>
                option.setName('reason').setDescription('reason to ban the player').setRequired(true)
              )
              .addStringOption((option) =>
                option
                  .setName('duration')
                  .setDescription('duration of the ban. Can use 1s, 1m, 1h, 1d')
                  .setRequired(true)
              )
              .addBooleanOption((option) =>
                option.setName('no-discord').setDescription('Do not check with Discord for similar names')
              )
              .addBooleanOption((option) =>
                option.setName('no-uuid').setDescription('Do not check with Mojang for user UUID')
              )
          )
          .addSubcommand(new SlashCommandSubcommandBuilder().setName('list').setDescription('list all banned members'))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('mute')
          .setDescription('Manage muted members')
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName('add')
              .setDescription('Add a member to muted list')
              .addStringOption((option) =>
                option.setName('username').setDescription('username of the player to mute').setRequired(true)
              )
              .addStringOption((option) =>
                option.setName('reason').setDescription('reason to mute the player').setRequired(true)
              )
              .addStringOption((option) =>
                option
                  .setName('duration')
                  .setDescription('duration of the mute. Can use 1s, 1m, 1h, 1d')
                  .setRequired(true)
              )
              .addBooleanOption((option) =>
                option.setName('no-discord').setDescription('Do not check with Discord for similar names')
              )
              .addBooleanOption((option) =>
                option.setName('no-uuid').setDescription('Do not check with Mojang for user UUID')
              )
          )
          .addSubcommand(new SlashCommandSubcommandBuilder().setName('list').setDescription('list all muted members'))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('kick')
          .setDescription('kick a member from all Minecraft instances')
          .addStringOption((option) =>
            option.setName('user').setDescription('username or userUuid of the player to kick').setRequired(true)
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
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder().setName('list').setDescription('List all active punishments')
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    console.log(JSON.stringify(context.interaction.options))

    switch (context.interaction.options.getSubcommandGroup()) {
      case 'ban': {
        switch (context.interaction.options.getSubcommand(true)) {
          case 'add': {
            if (context.privilege < Permission.OFFICER) {
              await context.showPermissionDenied()
              return
            }

            await handleBanAddInteraction(context.application, context.instanceName, context.interaction)
            return
          }
          case 'list': {
            await handleBanListInteraction(context.application, context.interaction)
            return
          }
          default: {
            throw new Error('New sub command found?')
          }
        }
      }
      case 'mute': {
        switch (context.interaction.options.getSubcommand(true)) {
          case 'add': {
            await handleMuteAddInteraction(context.application, context.instanceName, context.interaction)
            return
          }
          case 'list': {
            await handleMuteListInteraction(context.application, context.interaction)
            return
          }
          default: {
            throw new Error('New sub command found?')
          }
        }
      }
    }

    switch (context.interaction.options.getSubcommand()) {
      case 'kick': {
        if (context.privilege < Permission.OFFICER) {
          await context.showPermissionDenied()
          return
        }

        await handleKickInteraction(context.application, context.interaction)
        return
      }
      case 'list': {
        await handleAllListInteraction(context.application, context.interaction)
        return
      }
      case 'forgive': {
        if (context.privilege < Permission.OFFICER) {
          await context.showPermissionDenied()
          return
        }

        await handleForgiveInteraction(context.application, context.instanceName, context.interaction)
        return
      }
      case 'check': {
        await handleCheckInteraction(context.application, context.interaction)
        return
      }
      default: {
        throw new Error('No such command flow found')
      }
    }
  }
} satisfies CommandInterface

async function handleBanAddInteraction(
  application: Application,
  instanceName: string,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('username', true)
  const reason: string = interaction.options.getString('reason', true)
  const duration: string = interaction.options.getString('duration', true)
  const noDiscordCheck = interaction.options.getBoolean('no-discord') ?? false
  const noUuidCheck = interaction.options.getBoolean('no-uuid') ?? false

  const punishTill = Date.now() + getDuration(duration) * 1000
  const userIdentifiers = await findAboutUser(application.mojangApi, interaction, username, noDiscordCheck, noUuidCheck)

  const event: PunishmentAddEvent = {
    localEvent: true,
    instanceType: InstanceType.DISCORD,
    instanceName: instanceName,

    userName: userIdentifiers.userName,
    userUuid: userIdentifiers.userUuid,
    userDiscordId: userIdentifiers.discordUserId,

    type: PunishmentType.BAN,
    reason: reason,
    till: punishTill
  }

  application.punishedUsers.punish(event)
  application.clusterHelper.sendCommandToAllMinecraft(
    `/guild kick ${username} Banned for ${duration}. Reason: ${reason}`
  )

  await interaction.editReply({ embeds: [formatPunishmentAdd(event, noUuidCheck)] })
}

async function handleBanListInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const list = application.punishedUsers.getPunishmentsByType(PunishmentType.BAN)
  await pageMessage(interaction, formatList(list))
}

async function handleMuteAddInteraction(
  application: Application,
  instanceName: string,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // noinspection DuplicatedCode
  const username: string = interaction.options.getString('username', true)
  const reason: string = interaction.options.getString('reason', true)
  const duration: string = interaction.options.getString('duration', true)
  const noDiscordCheck = interaction.options.getBoolean('no-discord') ?? false
  const noUuidCheck = interaction.options.getBoolean('no-uuid') ?? false

  const punishTill = Date.now() + getDuration(duration) * 1000
  const userIdentifiers = await findAboutUser(application.mojangApi, interaction, username, noDiscordCheck, noUuidCheck)

  const event: PunishmentAddEvent = {
    localEvent: true,
    instanceType: InstanceType.DISCORD,
    instanceName: instanceName,

    userName: userIdentifiers.userName,
    userUuid: userIdentifiers.userUuid,
    userDiscordId: userIdentifiers.discordUserId,

    type: PunishmentType.MUTE,
    reason: reason,
    till: punishTill
  }

  application.punishedUsers.punish(event)
  application.clusterHelper.sendCommandToAllMinecraft(
    `/guild mute ${username} ${PunishedUsers.tillTimeToMinecraftDuration(punishTill)}`
  )
  application.clusterHelper.sendCommandToAllMinecraft(
    `/msg ${username} [AUTOMATED. DO NOT REPLY] Muted for: ${event.reason}`
  )

  await interaction.editReply({ embeds: [formatPunishmentAdd(event, noUuidCheck)] })
}

async function handleMuteListInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const list = application.punishedUsers.getPunishmentsByType(PunishmentType.MUTE)
  await pageMessage(interaction, formatList(list))
}

async function handleKickInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const username: string = interaction.options.getString('user', true)
  const reason: string = interaction.options.getString('reason', true)
  application.clusterHelper.sendCommandToAllMinecraft(`/g kick ${username} ${reason}`)

  await interaction.editReply({
    embeds: [
      {
        color: ColorScheme.GOOD,
        title: 'Punishment Status',
        description: `Kick command has been sent.\nPlease, ensure the player has been kicked.`,
        fields: [
          { name: 'Username', value: escapeDiscord(username) },
          { name: 'reason', value: escapeDiscord(reason) }
        ],
        footer: { text: DefaultCommandFooter }
      }
    ]
  })
}

async function handleForgiveInteraction(
  application: Application,
  instanceName: string,
  interaction: ChatInputCommandInteraction
): Promise<void> {
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
  const userIdentifiers = Object.values(userResolvedData).filter((identifier) => identifier !== undefined) as string[]

  const forgivenPunishments = application.punishedUsers.forgive({
    localEvent: true,
    instanceType: InstanceType.DISCORD,
    instanceName: instanceName,
    userIdentifiers: userIdentifiers
  })

  application.clusterHelper.sendCommandToAllMinecraft(`/guild unmute ${userResolvedData.userName}`)

  const pages: APIEmbed[] = []
  for (let index = 0; index < forgivenPunishments.length; index++) {
    const description = `__**Page ${index + 1} out of ${forgivenPunishments.length}**__\nPunishment(s) forgiven.`
    pages.push(formatPunishmentStatus(forgivenPunishments[index], description))
  }

  await (pages.length > 0
    ? pageMessage(interaction, pages)
    : interaction.editReply({
        embeds: [
          formatNoPunishmentStatus(userResolvedData.userName, userResolvedData.userUuid, userResolvedData.discordUserId)
        ]
      }))
}

async function handleAllListInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const list = application.punishedUsers.getAllPunishments()
  await pageMessage(interaction, formatList(list))
}

async function handleCheckInteraction(
  application: Application,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const username: string = interaction.options.getString('user', true)
  const userResolvedData = await findAboutUser(application.mojangApi, interaction, username, false, false)
  const userIdentifiers = Object.values(userResolvedData).filter((identifier) => identifier !== undefined) as string[]

  const activePunishments = application.punishedUsers.findPunishmentsByUser(userIdentifiers)

  const pages: APIEmbed[] = []
  for (let index = 0; index < activePunishments.length; index++) {
    const description = `__**Page ${index + 1} out of ${activePunishments.length}**__\nActive Punishments for this user.`
    pages.push(formatPunishmentStatus(activePunishments[index], description))
  }

  await (pages.length > 0
    ? pageMessage(interaction, pages)
    : interaction.editReply({
        embeds: [
          formatNoPunishmentStatus(userResolvedData.userName, userResolvedData.userUuid, userResolvedData.discordUserId)
        ]
      }))
}

function formatList(list: PunishmentAddEvent[]): APIEmbed[] {
  if (list.length === 0) {
    return [
      {
        color: ColorScheme.INFO,
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
      `- [${punishment.type}] Expires <t:${Math.floor(punishment.till / 1000)}:R> **${escapeDiscord(punishment.userName)}**: ${escapeDiscord(punishment.reason)}\n`
    )
  }

  const pages = []

  const MAX_LENGTH = 3900
  let currentLength = 0
  let entriesCount = 0
  for (const entry of entries) {
    if (pages.length === 0 || currentLength + entry.length > MAX_LENGTH || entriesCount >= 20) {
      currentLength = 0
      entriesCount = 0

      pages.push({
        color: ColorScheme.DEFAULT,
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
    assert(lastPage)
    lastPage.description += entry
  }

  return pages as APIEmbed[]
}

function formatPunishmentAdd(event: PunishmentAddEvent, noUuidCheck: boolean): APIEmbed {
  let description = 'Punishment forwarded to Minecraft \nand the member has been added to the punished list!\n'

  if (event.userDiscordId !== undefined) {
    description +=
      `\n__**Notice: Discord user <@${event.userDiscordId}> seem to have the same name.\n` +
      'The person is added to the punishment**__\n'
  }

  if (event.userUuid == undefined && !noUuidCheck) {
    description +=
      "\n**__Warning:__** The username doesn't seem to have a Minecraft account to mark it as well.\n" +
      'The username itself has been added as it is.\n' +
      'The user can evade in-game punishment if they change their username.\n'
  }

  return formatPunishmentStatus(event, description)
}

function formatPunishmentStatus(event: PunishmentAddEvent, description: string): APIEmbed {
  return {
    color: ColorScheme.GOOD,
    title: 'Punishment Status',
    description: description,
    fields: [
      { name: 'Username', value: event.userName, inline: true },
      { name: 'UUID', value: event.userUuid ? `\`${event.userUuid}\`` : 'None', inline: true },
      { name: 'Discord', value: event.userDiscordId ? `<@${event.userDiscordId}>` : 'None', inline: true },
      { name: 'Type', value: event.type, inline: true },
      { name: 'Created in', value: event.instanceType, inline: true },
      { name: 'Till', value: `Expires <t:${Math.floor(event.till / 1000)}:R>`, inline: true },
      { name: 'Reason', value: event.reason, inline: true }
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
    color: ColorScheme.GOOD,
    title: 'Punishment Status',
    description: 'There is no active punishments for that user.',
    fields: [
      { name: 'Username', value: userName, inline: true },
      { name: 'UUID', value: userUuid ? `\`${userUuid}\`` : 'None', inline: true },
      { name: 'Discord', value: discordUserId ? `<@${discordUserId}>` : 'None', inline: true }
    ],
    footer: { text: DefaultCommandFooter }
  }
}

async function findAboutUser(
  mojangApi: MojangApi,
  interaction: ChatInputCommandInteraction,
  username: string,
  noDiscordCheck: boolean,
  noUuidCheck: boolean
): Promise<{
  discordUserId: string | undefined
  userUuid: string | undefined
  userName: string
}> {
  const resultedUser = noDiscordCheck
    ? undefined
    : await interaction.guild?.members
        .search({ query: username, limit: 1 })
        .then((result) => result.first())
        .catch(() => undefined)

  const mojangProfile = noUuidCheck ? undefined : await mojangApi.profileByUsername(username).catch(() => undefined)

  return {
    discordUserId: resultedUser?.id,
    userName: mojangProfile?.name ?? username,
    userUuid: mojangProfile?.id
  }
}
