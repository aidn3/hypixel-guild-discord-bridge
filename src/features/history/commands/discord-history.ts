import assert from 'node:assert'

import { AttachmentBuilder, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import type Application from '../../../application.js'
import type { UserId } from '../../../common/application-event.js'
import { Permission, Platform } from '../../../common/application-event.js'
import type { DiscordCommandContext, DiscordPrivateCommandHandler } from '../../../common/commands.js'
import { CommandOrigin } from '../../../common/commands.js'
import { formatInvalidUsername } from '../../../instance/discord/common/commands-format.js'
import type { HistoryDatabase, HistoryEntry } from '../history-database.js'
import { HistoryType } from '../history-database.js'

export const DiscordHistoryCommand = {
  getCommandBuilder: function () {
    return new SlashCommandBuilder()
      .setName('history')
      .setDescription('Read history of users activities')
      .addSubcommand(new SlashCommandSubcommandBuilder().setName('all').setDescription('get all activities'))
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('minecraft')
          .setDescription('get history of a Minecraft player')
          .addStringOption((o) =>
            o
              .setName('username')
              .setDescription('username to view their history')
              .setRequired(true)
              .setAutocomplete(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('discord')
          .setDescription('get history of a Discord user')
          .addUserOption((o) => o.setName('user').setDescription('user to view their history').setRequired(true))
      )
  },
  origin: CommandOrigin.Private,
  permission: Permission.ApplicationAdmin,

  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies Omit<DiscordPrivateCommandHandler, 'handler'>

export async function discordHistoryCommandHandler(
  context: Readonly<DiscordCommandContext<CommandOrigin.Private>>,
  database: HistoryDatabase
) {
  const interaction = context.interaction
  const subCommand = interaction.options.getSubcommand()

  switch (subCommand) {
    case 'all': {
      await handleAllHistory(context, database)
      break
    }
    case 'discord': {
      await handleDiscordHistory(context, database)
      break
    }
    case 'minecraft': {
      await handleMinecraftHistory(context, database)
      break
    }
    default: {
      throw new Error('No such command flow found')
    }
  }
}

async function handleAllHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Private>>,
  database: HistoryDatabase
): Promise<void> {
  await context.interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const entries = database.all()
  if (entries.length === 0) {
    await context.interaction.editReply('No history to view.')
    return
  }
  const files = await deserialize(context.application, entries, context.interaction.attachmentSizeLimit)
  await context.interaction.editReply({
    files: files.map((file, index) => new AttachmentBuilder(Buffer.from(file, 'utf8'), { name: `all-${index}.txt` }))
  })
}

async function handleDiscordHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Private>>,
  database: HistoryDatabase
): Promise<void> {
  await context.interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const discordUser = context.interaction.options.getUser('user', true)
  const user = await context.application.core.initializeUser(
    { userId: discordUser.id, originInstance: Platform.Discord },
    { guild: context.interaction.guild ?? undefined }
  )

  const entries = database.byUser(user)
  const files = await deserialize(context.application, entries, context.interaction.attachmentSizeLimit)
  if (files.length === 0) {
    await context.interaction.editReply('No history to view.')
    return
  }

  await context.interaction.editReply({
    files: files.map(
      (file, index) => new AttachmentBuilder(Buffer.from(file, 'utf8'), { name: `${user.displayName()}-${index}.txt` })
    )
  })
}

async function handleMinecraftHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Private>>,
  database: HistoryDatabase
): Promise<void> {
  await context.interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const givenUsername = context.interaction.options.getString('username', true)
  const mojangProfile = await context.application.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
  if (mojangProfile === undefined) {
    await context.interaction.editReply({ embeds: [formatInvalidUsername(givenUsername)] })
    return
  }

  const user = await context.application.core.initializeMinecraftUser(mojangProfile, {
    guild: context.interaction.guild ?? undefined
  })

  const entries = database.byUser(user)
  const files = await deserialize(context.application, entries, context.interaction.attachmentSizeLimit)
  if (files.length === 0) {
    await context.interaction.editReply('No history to view.')
    return
  }

  await context.interaction.editReply({
    files: files.map(
      (file, index) => new AttachmentBuilder(Buffer.from(file, 'utf8'), { name: `${user.displayName()}-${index}.txt` })
    )
  })
}

async function deserialize(
  application: Application,
  entries: HistoryEntry[],
  fileBytesSize: number
): Promise<string[]> {
  entries.sort((a, b) => a.createdAt - b.createdAt)

  const files: string[] = []
  let file = ''
  for (const entry of entries) {
    let line = `${new Date(entry.createdAt * 1000).toISOString()}: `
    switch (entry.historyType) {
      case HistoryType.Chat: {
        const username = await resolveUsername(application, entry.userId)
        line += `[Chat] ${entry.platform}/${entry.channelType} > ${username}: ${entry.message}`
        break
      }
      case HistoryType.CommandResponse: {
        const username = await resolveUsername(application, entry.userId)
        line += `[Command] ${entry.platform}/${entry.channelType} > ${username}: ${entry.message}`
        break
      }
      case HistoryType.CommandFeedback: {
        const username = await resolveUsername(application, entry.userId)
        line += `[Command Feedback] ${entry.platform}/${entry.channelType} > ${username}: ${entry.message}`
        break
      }
      case HistoryType.GuildGeneralActivity: {
        line += `[Guild General] ${entry.type} > ${entry.message}`
        break
      }
      case HistoryType.GuildPlayerActivity: {
        line += `[Guild Player] ${entry.type} > `
        if (entry.userId !== undefined) {
          const username = await resolveUsername(application, entry.userId)
          line += `${username}: `
        }
        line += entry.message
        break
      }
      default: {
        entry satisfies never
        assert.fail(`Unknown history entry: ${JSON.stringify(entry)}`)
      }
    }

    if (file.length + line.length > fileBytesSize) {
      files.push(file)
      file = ''
    }

    if (file.length > 0) file += '\n'
    file += line
  }

  if (file.length > 0) files.push(file)
  return files
}

async function resolveUsername(application: Application, userId: UserId): Promise<string> {
  const identifier = application.core.users.getUserIdentifier(userId)
  if (identifier === undefined) return userId.toString(10)

  switch (identifier.originInstance) {
    case Platform.Discord: {
      const discord = await application.discordInstance.profileById(identifier.userId, undefined).catch(() => undefined)
      if (discord === undefined) return identifier.userId
      return discord.type === 'cached' ? discord.username : discord.id
    }

    case Platform.Minecraft: {
      const mojang = await application.mojangApi.profileByUuid(identifier.userId).catch(() => undefined)
      return mojang?.name ?? identifier.userId
    }

    default: {
      return identifier.userId
    }
  }
}
