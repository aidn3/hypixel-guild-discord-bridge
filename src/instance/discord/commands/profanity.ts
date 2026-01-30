import type { APIEmbed } from 'discord.js'
import {
  escapeMarkdown,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type {
  DiscordAutoCompleteContext,
  DiscordCommandContext,
  DiscordCommandHandler
} from '../../../common/commands.js'
import type { ProfanityReplace } from '../../../core/moderation/profanity'
import Duration from '../../../utility/duration'
import { search } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config'
import { DefaultTimeout, interactivePaging } from '../utility/discord-pager.js'

const ReplaceCommand = 'replace'
const IncludeCommand = 'include'
const ExcludeCommand = 'exclude'

const List = 'list'
const Add = 'add'
const Remove = 'remove'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('profanity')
      .setDescription('Manage application profanity filter')
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName(ReplaceCommand)
          .setDescription('Manage words replacements')
          .addSubcommand(new SlashCommandSubcommandBuilder().setName(List).setDescription('list all replacers'))
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Add)
              .setDescription('add a profanity replacer')
              .addStringOption((o) => o.setName('search').setDescription('Regex/search to lookup').setRequired(true))
              .addStringOption((o) => o.setName('replace').setDescription('What to replace with').setRequired(true))
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Remove)
              .setDescription('remove a profanity replacer')
              .addNumberOption((o) => o.setName('id').setDescription('ID of the replacer to remove').setRequired(true))
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName(IncludeCommand)
          .setDescription('Manage filtered words')
          .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(List).setDescription('list all included profanity words')
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Add)
              .setDescription('add profanity words to filter')
              .addStringOption((o) =>
                o.setName('words').setDescription('words to add delimited by a comma').setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Remove)
              .setDescription('remove profanity words from filter')
              .addStringOption((o) =>
                o.setName('word').setDescription('word to remove').setRequired(true).setAutocomplete(true)
              )
          )
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName(ExcludeCommand)
          .setDescription('Manage excluded filtered words')
          .addSubcommand(
            new SlashCommandSubcommandBuilder().setName(List).setDescription('list all excluded profanity words')
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Add)
              .setDescription('add an exclusion to profanity filter')
              .addStringOption((o) =>
                o.setName('words').setDescription('words to add delimited by a comma').setRequired(true)
              )
          )
          .addSubcommand(
            new SlashCommandSubcommandBuilder()
              .setName(Remove)
              .setDescription('remove an exclusion from profanity filter')
              .addStringOption((o) =>
                o.setName('word').setDescription('word to remove').setRequired(true).setAutocomplete(true)
              )
          )
      ),
  permission: Permission.Officer,

  handler: async function (context) {
    if (!context.interaction.channel) {
      await context.interaction.reply({
        content: 'This command can only be executed in a text-based guild channel',
        flags: MessageFlags.Ephemeral
      })
      return
    }
    const groupCommand = context.interaction.options.getSubcommandGroup(true)
    switch (groupCommand) {
      case ReplaceCommand: {
        await handleReplaceInteraction(context)
        break
      }
      case ExcludeCommand:
      case IncludeCommand: {
        await handleProfanityInteraction(context, groupCommand)
        break
      }
    }
  },
  autoComplete: async function (context) {
    const groupCommand = context.interaction.options.getSubcommandGroup(true) as
      | typeof IncludeCommand
      | typeof ExcludeCommand
    const subCommand = context.interaction.options.getSubcommand(true)
    if (subCommand === Remove) {
      const option = context.interaction.options.getFocused(true)
      if (option.name !== 'word') return
      const list = getList(context, groupCommand)

      const response = search(option.value, list)
        .slice(0, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function handleReplaceInteraction(context: Readonly<DiscordCommandContext>) {
  switch (context.interaction.options.getSubcommand()) {
    case List: {
      await handleReplaceList(context)
      break
    }
    case Add: {
      await handleReplaceAdd(context)
      break
    }
    case Remove: {
      await handleReplaceRemove(context)
      break
    }
  }
}

async function handleReplaceList(context: DiscordCommandContext): Promise<void> {
  await context.interaction.deferReply()

  await interactivePaging(
    context.interaction,
    0,
    Duration.minutes(10).toMilliseconds(),
    context.errorHandler,
    (currentPage) => {
      const EntriesPerPage = 5
      const all = context.application.core.profanity.getAllReplacers()
      const chunk = all.slice(currentPage * EntriesPerPage, (currentPage + 1) * EntriesPerPage)
      const totalPages = Math.ceil(all.length / EntriesPerPage)

      const embed = {
        title: 'Profanity Replacers',
        description: '',
        color: Color.Default,
        footer: { text: DefaultCommandFooter }
      } satisfies APIEmbed

      if (chunk.length === 0) {
        embed.color = Color.Info
        embed.description = '__Nothing to show.__'
      } else {
        embed.description = chunk.map((entry) => formatProfanityReplacer(entry)).join('\n\n')
      }

      return { embed: embed, totalPages: totalPages }
    }
  )
}

async function handleReplaceAdd(context: DiscordCommandContext): Promise<void> {
  const search = context.interaction.options.getString('search', true)
  const replace = context.interaction.options.getString('replace', true)

  await context.interaction.deferReply()

  try {
    new RegExp(search, 'ig')
  } catch {
    await context.interaction.editReply({
      embeds: [
        {
          description: `Bad search Regex: \`${search}\`.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const addedEntry = context.application.core.profanity.addReplace({ replace, search })
  context.application.core.reloadProfanity()

  await context.interaction.editReply({
    embeds: [
      {
        description: `Added profanity replacer successfully!\n\n` + formatProfanityReplacer(addedEntry),
        color: Color.Good,
        footer: { text: DefaultCommandFooter }
      }
    ]
  })
}

async function handleReplaceRemove(context: DiscordCommandContext): Promise<void> {
  const id = context.interaction.options.getNumber('id', true)
  await context.interaction.deferReply()

  const deletedProfanity = context.application.core.profanity.removeReplace(id)
  if (deletedProfanity === undefined) {
    await context.interaction.editReply({
      embeds: [
        {
          description: `No such a profanity replacer \`${id.toString(10)}\`.`,
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  context.application.core.reloadProfanity()
  await context.interaction.editReply({
    embeds: [
      {
        description: `Removed profanity replacer successfully!\n\n` + formatProfanityReplacer(deletedProfanity),
        color: Color.Good,
        footer: { text: DefaultCommandFooter }
      }
    ]
  })
}

function formatProfanityReplacer(entry: ProfanityReplace): string {
  return (
    `**ID:** \`${entry.id.toString(10)}\`\n` + `**Search:** \`${entry.search}\`\n` + `**Replace:** \`${entry.replace}\``
  )
}

export async function handleProfanityInteraction(
  context: DiscordCommandContext,
  group: typeof IncludeCommand | typeof ExcludeCommand
): Promise<void> {
  switch (context.interaction.options.getSubcommand()) {
    case List: {
      await handleList(context, group)
      break
    }
    case Add: {
      await handleAdd(context, group)
      break
    }
    case Remove: {
      await handleRemove(context, group)
      break
    }
  }
}

async function handleList(
  context: DiscordCommandContext,
  group: typeof IncludeCommand | typeof ExcludeCommand
): Promise<void> {
  const EntriesPerPage = 20

  await context.interaction.deferReply()

  await interactivePaging(context.interaction, 0, DefaultTimeout, context.errorHandler, (page) => {
    const list = getList(context, group)

    const entries = list.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
    const totalPages = Math.ceil(list.length / EntriesPerPage)
    return {
      totalPages: totalPages,
      embed: {
        title: `[${group}] Profanity Filter (page ${page + 1} out of ${Math.max(totalPages, 1)})`,
        description:
          entries.length === 0 ? '__Empty List__' : entries.map((entry) => `- ${escapeMarkdown(entry)}`).join('\n')
      }
    }
  })
}

async function handleAdd(
  context: DiscordCommandContext,
  group: typeof IncludeCommand | typeof ExcludeCommand
): Promise<void> {
  const list = getList(context, group)

  const words = context.interaction.options
    .getString('words', true)
    .split(',')
    .map((word) => word.trim())

  let changed = false
  const result = { title: "Profanity Filter Add's Results", description: '', color: Color.Good } satisfies APIEmbed

  for (const word of words) {
    if (list.some((entry) => entry.toLowerCase() === word.toLowerCase())) {
      result.description += `- \`${escapeMarkdown(word)}\` already exists.\n`
      result.color = Color.Info
      continue
    }

    list.push(word)
    result.description += `- \`${escapeMarkdown(word)}\` added.\n`
    changed = true
  }

  if (changed) {
    setList(context, group, list)
    context.application.core.reloadProfanity()
  }
  await context.interaction.reply({ embeds: [result] })
}

async function handleRemove(
  context: DiscordCommandContext,
  group: typeof IncludeCommand | typeof ExcludeCommand
): Promise<void> {
  const list = getList(context, group)
  const word = context.interaction.options.getString('word', true)

  const result = {
    title: `[${group}] Profanity Filter Remove's Result`,
    description: '',
    color: Color.Good
  } satisfies APIEmbed

  const index = list.map((entry) => entry.toLowerCase()).indexOf(word.toLowerCase())
  if (index === -1) {
    result.color = Color.Info
    result.description = `Could not find \`${escapeMarkdown(word)}\` in the list.`
  } else {
    list.splice(index, 1)

    setList(context, group, list)
    context.application.core.reloadProfanity()

    result.description = `Word \`${escapeMarkdown(word)}\` has been removed from the list.`
  }

  await context.interaction.reply({ embeds: [result] })
}

function getList(
  context: DiscordCommandContext | DiscordAutoCompleteContext,
  group: typeof IncludeCommand | typeof ExcludeCommand
): string[] {
  const config = context.application.core.moderationConfiguration
  if (group === IncludeCommand) {
    return config.getProfanityBlacklist()

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (group === ExcludeCommand) {
    return config.getProfanityWhitelist()
  } else {
    throw new Error('Unknown list??')
  }
}

function setList(
  context: DiscordCommandContext,
  group: typeof IncludeCommand | typeof ExcludeCommand,
  values: string[]
): void {
  const config = context.application.core.moderationConfiguration
  if (group === IncludeCommand) {
    config.setProfanityBlacklist(values)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (group === ExcludeCommand) {
    config.setProfanityWhitelist(values)
  } else {
    throw new Error('Unknown list??')
  }
}
