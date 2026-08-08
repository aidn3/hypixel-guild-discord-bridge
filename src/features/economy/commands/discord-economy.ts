import assert from 'node:assert'

import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import type { UserId } from '../../../common/application-event'
import { Permission, Platform } from '../../../common/application-event'
import type { DiscordBridgeCommandHandler, DiscordCommandContext } from '../../../common/commands'
import { CommandOrigin, OptionMinecraftInstance } from '../../../common/commands'
import { formatInvalidUsername, formatUser } from '../../../instance/discord/common/commands-format'
import { interactivePaging } from '../../../instance/discord/utility/discord-pager'
import Duration from '../../../utility/duration'
import type { EconomyDatabase, SavedHistory } from '../economy-database'
import { EconomyReason } from '../economy-database'

export const DiscordGuildCommand = {
  getCommandBuilder: function () {
    return new SlashCommandBuilder()
      .setName('economy')
      .setDescription('Manage the economy of all users')
      .addSubcommand(new SlashCommandSubcommandBuilder().setName('history').setDescription('view all users history'))
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('history-discord')
          .setDescription('view a user history')
          .addUserOption((o) => o.setName('user').setDescription('user to view their history').setRequired(true))
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('history-minecraft')
          .setDescription('view a user history')
          .addStringOption((o) =>
            o
              .setName('username')
              .setDescription('username to view their history')
              .setRequired(true)
              .setAutocomplete(true)
          )
      )
  },
  origin: CommandOrigin.Bridge,
  permission: Permission.Officer,
  addMinecraftInstancesToOptions: OptionMinecraftInstance.None,

  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies Omit<DiscordBridgeCommandHandler<OptionMinecraftInstance.None>, 'handler'>

export async function discordEconomyCommandHandler(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  database: EconomyDatabase
) {
  const interaction = context.interaction
  const subCommand = interaction.options.getSubcommand()

  switch (subCommand) {
    case 'history': {
      await handleAllHistory(context, database)
      break
    }
    case 'history-discord': {
      await handleDiscordHistory(context, database)
      break
    }
    case 'history-minecraft': {
      await handleMinecraftHistory(context, database)
      break
    }
    default: {
      throw new Error('No such command flow found')
    }
  }
}

async function handleAllHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  database: EconomyDatabase
): Promise<void> {
  await context.interaction.deferReply()

  await interactivePaging(
    context.interaction,
    1,
    Duration.minutes(15).toMilliseconds(),
    context.errorHandler,
    async (currentPage) => {
      const history = database.allHistory(currentPage - 1) // 0-indexed

      let result = ''
      for (const entry of history.entries) {
        result += `**${entry.index + 1}.** `
        result += await formatReason(context, entry.content)
        result += '\n'
      }

      result = result.trim()

      return {
        totalPages: history.totalPages,
        embed: { title: 'All Economy History', description: result.length === 0 ? `_Nothing to show_` : result }
      }
    }
  )
}

async function handleDiscordHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  database: EconomyDatabase
): Promise<void> {
  await context.interaction.deferReply()
  const discordUser = context.interaction.options.getUser('user', true)
  const user = await context.application.core.initializeUser(
    { userId: discordUser.id, originInstance: Platform.Discord },
    { guild: context.interaction.guild ?? undefined }
  )

  await interactivePaging(
    context.interaction,
    1,
    Duration.minutes(15).toMilliseconds(),
    context.errorHandler,
    async (currentPage) => {
      const history = database.userHistory(user, currentPage - 1) // 0-indexed

      let result = ''
      for (const entry of history.entries) {
        result += `**${entry.index + 1}.** `
        result += await formatReason(context, entry.content)
        result += '\n'
      }

      result = result.trim()

      return {
        totalPages: history.totalPages,
        embed: {
          title: `${user.displayName()} Economy History`,
          description: result.length === 0 ? `_Nothing to show_` : result
        }
      }
    }
  )
}

async function handleMinecraftHistory(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  database: EconomyDatabase
): Promise<void> {
  await context.interaction.deferReply()
  const givenUsername = context.interaction.options.getString('username', true)
  const mojangProfile = await context.application.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
  if (mojangProfile === undefined) {
    await context.interaction.editReply({ embeds: [formatInvalidUsername(givenUsername)] })
    return
  }

  const user = await context.application.core.initializeMinecraftUser(mojangProfile, {
    guild: context.interaction.guild ?? undefined
  })

  await interactivePaging(
    context.interaction,
    1,
    Duration.minutes(15).toMilliseconds(),
    context.errorHandler,
    async (currentPage) => {
      const history = database.userHistory(user, currentPage - 1) // 0-indexed

      let result = ''
      for (const entry of history.entries) {
        result += `**${entry.index + 1}.** `
        result += await formatReason(context, entry.content)
        result += '\n'
      }

      result = result.trim()

      return {
        totalPages: history.totalPages,
        embed: {
          title: `${user.displayName()} Economy History`,
          description: result.length === 0 ? `_Nothing to show_` : result
        }
      }
    }
  )
}

async function formatReason(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  entry: SavedHistory
): Promise<string> {
  switch (entry.reason) {
    case EconomyReason.DailyReward: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      return `${amount} ${user} claimed daily reward`
    }
    case EconomyReason.RussianRoulette: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      return `${amount} ${user} played Russian Roulette`
    }
    case EconomyReason.Insult: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} insulted by ${byUser}`
    }
    case EconomyReason.Praise: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} praised by ${byUser}`
    }
    case EconomyReason.UserGive: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} given by ${byUser}`
    }
    case EconomyReason.UserTake: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} taken by ${byUser}`
    }
    case EconomyReason.WonSpontaneousEvent: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      return `${amount} ${user} won an event`
    }
    case EconomyReason.SacrificeFrom: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} lost to sacrifice by ${byUser}`
    }
    case EconomyReason.SacrificeTo: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} sacrificed to bully ${byUser}`
    }
    case EconomyReason.MuteTarget: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} randomly muted ${byUser}`
    }
    case EconomyReason.AirstrikeTarget: {
      const amount = formatAmount(entry.change)
      const user = await formatUserId(context, entry.userId)
      const byUser = await formatUserId(context, entry.byUser)
      return `${amount} ${user} airstriked ${byUser}`
    }
    default: {
      entry.reason satisfies never
      assert.fail(`unknown entry reason: ${JSON.stringify(entry)}`)
    }
  }
}

async function formatUserId(
  context: Readonly<DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.None>>,
  userId: UserId | undefined
): Promise<string> {
  if (userId === undefined) return 'UNKNOWN'

  const identifier = context.application.core.users.getUserIdentifier(userId)
  if (identifier === undefined) return 'UNKNOWN'

  const user = await context.application.core.initializeUser(identifier, {
    guild: context.interaction.guild ?? undefined
  })
  return formatUser(user)
}

function formatAmount(amount: number): string {
  if (amount === 0) return '0'
  else if (amount > 0) return `+${amount}`
  else if (amount < 0) return `${amount}`
  else return amount.toString(10)
}
