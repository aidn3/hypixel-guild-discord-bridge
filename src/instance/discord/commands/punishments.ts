import assert from 'node:assert'

import type { APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import {
  ComponentType,
  escapeHeading,
  escapeMarkdown,
  MessageFlags,
  quote,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  userMention
} from 'discord.js'

import { Color, InstanceType, Permission, PunishmentType } from '../../../common/application-event.js'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import type { DiscordUser, MojangProfile, User } from '../../../common/user'
import { HeatResult, HeatType } from '../../../core/moderation/commands-heat'
import type { SavedPunishment } from '../../../core/moderation/punishments'
import type { RegexChat } from '../../../utility/chat-triggers.js'
import { checkChatTriggers, KickChat, MuteChat, UnmuteChat } from '../../../utility/chat-triggers.js'
import type Duration from '../../../utility/duration'
import { durationToMinecraftDuration, formatTime, getDuration } from '../../../utility/shared-utility'
import { formatInvalidUsername } from '../common/commands-format'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type { FetchPageResult } from '../utility/discord-pager.js'
import { DefaultTimeout, interactivePaging } from '../utility/discord-pager.js'

export default {
  getCommandBuilder: function () {
    const durationOption = new SlashCommandStringOption()
      .setName('duration')
      .setDescription('duration of the ban. Can use 1s, 1m, 1h, 1d')
      .setRequired(true)
    const reasonOption = new SlashCommandStringOption()
      .setName('reason')
      .setDescription('reason to ban the user')
      .setRequired(true)

    const minecraftOption = () =>
      new SlashCommandSubcommandBuilder()
        .setName('minecraft')
        .setDescription('Ban a Minecraft player')
        .addStringOption((option) =>
          option
            .setName('username')
            .setDescription('username of the player to ban')
            .setRequired(true)
            .setAutocomplete(true)
        )
    const discordOption = () =>
      new SlashCommandSubcommandBuilder()
        .setName('discord')
        .setDescription('Ban a Discord user')
        .addUserOption((option) => option.setName('user').setDescription('user to ban').setRequired(true))

    return new SlashCommandBuilder()
      .setName('punishments')
      .setDescription('Manage active punishments')

      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('ban')
          .setDescription('Add a member to the ban list')
          .addSubcommand(minecraftOption().addStringOption(durationOption).addStringOption(reasonOption))
          .addSubcommand(discordOption().addStringOption(durationOption).addStringOption(reasonOption))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('mute')
          .setDescription('Add a member to the mute list')
          .addSubcommand(minecraftOption().addStringOption(durationOption).addStringOption(reasonOption))
          .addSubcommand(discordOption().addStringOption(durationOption).addStringOption(reasonOption))
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('kick')
          .setDescription('kick a member from all Minecraft instances')
          .addSubcommand(minecraftOption())
          .addSubcommand(discordOption())
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('forgive')
          .setDescription('forgive a member by removing all active punishments on them')
          .addSubcommand(minecraftOption())
          .addSubcommand(discordOption())
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('check')
          .setDescription('Check a member punishment status')
          .addSubcommand(minecraftOption())
          .addSubcommand(discordOption())
      )
      .addSubcommand(new SlashCommandSubcommandBuilder().setName('list').setDescription('List all active punishments'))
  },
  permission: Permission.Helper,

  handler: async function (context) {
    const interaction = context.interaction
    interaction.inGuild()
    await interaction.deferReply()

    const groupCommand = interaction.options.getSubcommandGroup()
    const subCommand = interaction.options.getSubcommand(true)
    if (!groupCommand && subCommand === 'list') {
      await handleAllListInteraction(context)
      return
    }

    let target: User | undefined
    switch (subCommand) {
      case 'minecraft': {
        const username = interaction.options.getString('username', true)
        let mojangProfile: MojangProfile
        try {
          mojangProfile = await context.application.mojangApi.profileByUsername(username)
        } catch (error: unknown) {
          context.errorHandler.error('fetching minecraft profile', error)
          await interaction.reply({ embeds: [formatInvalidUsername(username)] })
          return
        }
        target = await context.application.core.initializeMinecraftUser(mojangProfile, {
          guild: interaction.guild ?? undefined
        })
        break
      }

      case 'discord': {
        const selectedUser = interaction.options.getUser('user', true)
        const guildMember = interaction.guild?.members.cache.get(selectedUser.id)
        const profile = context.application.discordInstance.profileByUser(selectedUser, guildMember)
        target = await context.application.core.initializeDiscordUser(profile, {
          guild: interaction.guild ?? undefined
        })
        break
      }

      default: {
        throw new Error(`Unknown sub command. given ${subCommand}`)
      }
    }

    const guildMember = interaction.guild?.members.cache.get(context.interaction.user.id)
    const responsibleProfile = context.application.discordInstance.profileByUser(context.interaction.user, guildMember)
    const responsible = await context.application.core.initializeDiscordUser(responsibleProfile, {
      guild: interaction.guild ?? undefined
    })

    const durationRaw = interaction.options.getString('duration') ?? undefined
    const reasonRaw = interaction.options.getString('reason') ?? undefined

    switch (groupCommand) {
      case 'ban': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        assert.ok(durationRaw !== undefined)
        assert.ok(reasonRaw !== undefined)
        await handleBan(context, responsible, target, getDuration(durationRaw), reasonRaw)
        return
      }
      case 'mute': {
        assert.ok(durationRaw !== undefined)
        assert.ok(reasonRaw !== undefined)

        await handleMute(context, responsible, target, getDuration(durationRaw), reasonRaw)
        return
      }
      case 'kick': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        assert.ok(reasonRaw !== undefined)

        await handleKick(context, responsible, target, reasonRaw)
        return
      }
      case 'forgive': {
        if (context.permission < Permission.Officer) {
          await context.showPermissionDenied()
          return
        }

        await handleForgive(context, responsible, target)
        return
      }
      case 'check': {
        await handleCheckInteraction(context, target)
        return
      }
      default: {
        throw new Error('No such command flow found')
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

async function handleBan(
  context: DiscordCommandContext,
  responsible: DiscordUser,
  target: User,
  duration: Duration,
  reason: string
): Promise<void> {
  const header =
    `## Ban ${formatUser(target)}\n\n` +
    'User has been added to internal ban-list.\n' +
    'User will not be able to join any in-game guild or speak in discord bridge channels.'

  const mojangProfile = target.mojangProfile()
  let command: string | undefined
  if (mojangProfile !== undefined) {
    command = `/guild kick ${mojangProfile.id} Banned for ${formatTime(duration.toMilliseconds())}. Reason: ${reason}`
  }

  const post = () => {
    const punishment = target.ban(context.eventHelper.fillBaseEvent(), duration, reason)
    return `## Punishment\n${formatPunishment(punishment, undefined)}`
  }

  await takeAction(context, responsible, target, header, HeatType.Kick, command, KickChat, post)
}

async function handleMute(
  context: DiscordCommandContext,
  responsible: DiscordUser,
  target: User,
  duration: Duration,
  reason: string
): Promise<void> {
  const header =
    `## Mute ${formatUser(target)}\n\n` +
    'User has been added to internal mute-list.\n' +
    'User will not be able to speak in any in-game guild or in discord bridge channels.'

  const mojangProfile = target.mojangProfile()
  let command: string | undefined
  if (mojangProfile !== undefined) {
    command = `/guild mute ${mojangProfile.id} ${durationToMinecraftDuration(duration.toMilliseconds())}`
  }

  const post = () => {
    const punishment = target.mute(context.eventHelper.fillBaseEvent(), duration, reason)
    return `## Punishment\n${formatPunishment(punishment, undefined)}`
  }

  await takeAction(context, responsible, target, header, HeatType.Mute, command, MuteChat, post)
}

async function handleKick(
  context: DiscordCommandContext,
  responsible: DiscordUser,
  target: User,
  reason: string
): Promise<void> {
  const header = `## Kick ${formatUser(target)}\n\n` + 'Kick action will be taken. Make sure the action is successful!'

  const mojangProfile = target.mojangProfile()
  let command: string | undefined
  if (mojangProfile !== undefined) {
    command = `/guild kick ${mojangProfile.id} kicked: ${reason}`
  }
  const post = () => undefined

  await takeAction(context, responsible, target, header, HeatType.Kick, command, KickChat, post)
}

async function handleForgive(context: DiscordCommandContext, responsible: DiscordUser, target: User): Promise<void> {
  const header =
    `## Forgive ${formatUser(target)}\n\n` +
    'User has been removed from all internal punishments list.\n' +
    'User will be treated as if never punished before.'

  const mojangProfile = target.mojangProfile()
  let command: string | undefined
  if (mojangProfile !== undefined) {
    command = `/guild unmute ${mojangProfile.id}`
  }

  const post = () => {
    let result = '## Forgiven punishment(s)\n'

    const forgivenPunishments = target.forgive(context.eventHelper.fillBaseEvent())
    if (forgivenPunishments.length === 0) {
      result += 'No saved punishment found to forgive. All good!'
    } else {
      result += '\n'
      for (const forgivenPunishment of forgivenPunishments) {
        result += formatPunishment(forgivenPunishment, undefined) + '\n\n'
      }
    }

    return result.trimEnd()
  }

  await takeAction(context, responsible, target, header, HeatType.Mute, command, UnmuteChat, post)
}

async function takeAction(
  context: DiscordCommandContext,
  responsible: DiscordUser,
  target: User,
  header: string,
  heatType: HeatType,
  command: string | undefined,
  chatTrigger: RegexChat,
  post: () => string | undefined
): Promise<void> {
  const heat = responsible.tryAddModerationAction(heatType)
  if (heat === HeatResult.Denied) {
    await handleHeatDenied(context.interaction)
    return
  }

  let noError = true
  let result = header

  const mojangProfile = target.mojangProfile()
  const instances = context.application.getInstancesNames(InstanceType.Minecraft)
  if (mojangProfile !== undefined && command !== undefined && instances.length > 0) {
    result += '\n\n### In-game Actions\n'

    const triggerResult = await checkChatTriggers(
      context.application,
      context.eventHelper,
      chatTrigger,
      instances,
      command,
      mojangProfile.name
    )
    if (triggerResult.message.length === 0) {
      noError = false
      result += 'Unknown in-game result'
    } else if (triggerResult.message.length === 1) {
      result += quote(escapeHeading(triggerResult.message[0].content))
    } else if (triggerResult.message.length > 1) {
      noError = false
      result += triggerResult.message
        .map((entry) => `[${escapeMarkdown(entry.instanceName)}] ${escapeMarkdown(entry.content)}`)
        .join('\n')
    }

    if (triggerResult.status !== 'success') noError = false
  }

  const postResponse = post()
  if (typeof postResponse === 'string' && postResponse.trim().length > 0) {
    result += '\n\n' + postResponse.trim()
  }

  if (heat === HeatResult.Warn) {
    noError = false
    result += '\n\n' + generateHeatWarning()
  }

  result += '\n\n-# ' + escapeMarkdown(DefaultCommandFooter)

  await context.interaction.editReply({
    components: [
      {
        type: ComponentType.Container,
        components: [{ type: ComponentType.TextDisplay, content: result }],
        accentColor: noError ? Color.Good : Color.Info
      }
    ],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  })
}

async function handleAllListInteraction(context: DiscordCommandContext): Promise<void> {
  await interactivePaging(
    context.interaction,
    0,
    DefaultTimeout,
    context.errorHandler,
    async (page: number): Promise<FetchPageResult> => {
      const punishments = context.application.core.allPunishments()

      const list = await formatList(context, punishments, page)

      return {
        totalPages: list.total,
        embed: {
          title: 'All Active Punishments',
          description: list.content.trim(),
          footer: { text: DefaultCommandFooter }
        }
      }
    }
  )
}

async function handleCheckInteraction(context: DiscordCommandContext, target: User): Promise<void> {
  await interactivePaging(
    context.interaction,
    0,
    DefaultTimeout,
    context.errorHandler,
    async (page: number): Promise<FetchPageResult> => {
      const thumbnail = target.avatar()
      const punishments = target.punishments().all()

      const result = `**${formatUser(target)} Active Punishments**\n`
      const list = await formatList(undefined, punishments, page)

      return {
        totalPages: list.total,
        embed: {
          description: result + list.content.trim(),
          thumbnail: thumbnail ? { url: thumbnail } : undefined,
          footer: { text: DefaultCommandFooter }
        }
      }
    }
  )
}

async function formatList(
  context: DiscordCommandContext | undefined,
  list: SavedPunishment[],
  page: number
): Promise<{ total: number; content: string }> {
  const EntriesPerPage = 5
  const totalPages = Math.ceil(list.length / EntriesPerPage)
  const chunk = list.slice(EntriesPerPage * page, EntriesPerPage * (page + 1))
  if (chunk.length === 0) {
    return { total: totalPages, content: 'no punishment to view.' }
  }

  let result = ''
  for (const punishment of chunk) {
    let user: User | undefined
    if (context !== undefined) {
      user = await context.application.core.initializeUser(
        { originInstance: punishment.originInstance, userId: punishment.userId },
        {
          guild: context.interaction.guild ?? undefined
        }
      )
    }

    result += formatPunishment(punishment, user) + '\n\n'
  }
  return {
    total: totalPages,
    content: result.trimEnd()
  }
}

function generateHeatWarning(): string {
  return (
    '### Guild Protection\n' +
    'You are taking too many actions in a short period.\n' +
    'If you continue, you will be temporarily blocked from taking any more actions.\n' +
    'If you believe the actions you are taking are urgent, contact other staff to do the actions on your behalf.\n' +
    'If the actions you have taken so far are not drastic, ask the bridge admin to increase the limit.'
  )
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

function formatUser(user: User): string {
  const mojangProfile = user.mojangProfile()
  const discordProfile = user.discordProfile()

  if (mojangProfile !== undefined && discordProfile !== undefined) {
    return `${escapeMarkdown(mojangProfile.name)} (${userMention(discordProfile.id)})`
  } else if (mojangProfile !== undefined) {
    return escapeMarkdown(mojangProfile.name)
  } else if (discordProfile === undefined) {
    return `~${escapeMarkdown(user.displayName())}`
  } else {
    return `~${escapeMarkdown(user.displayName())} (${userMention(discordProfile.id)})`
  }
}

function formatPunishment(punishment: SavedPunishment, userToFormat: User | undefined): string {
  let result = ''

  result += `<t:${Math.floor(punishment.createdAt / 1000)}> `

  if (userToFormat !== undefined) {
    result += `${formatUser(userToFormat)} `
  }

  switch (punishment.type) {
    case PunishmentType.Ban: {
      result += 'banned '
      break
    }
    case PunishmentType.Mute: {
      result += 'muted '
      break
    }
  }

  result += `for ${formatTime(punishment.till - punishment.createdAt)} ends <t:${Math.floor(punishment.till / 1000)}:R>`
  result += `\n> ${escapeMarkdown(punishment.reason)}`

  return result
}
