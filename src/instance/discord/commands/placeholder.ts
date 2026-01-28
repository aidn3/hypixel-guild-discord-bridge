import assert from 'node:assert'

import type { ButtonInteraction } from 'discord.js'
import {
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder
} from 'discord.js'

import { Color } from '../../../common/application-event'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../../common/commands.js'
import type { PlaceholderContext } from '../../../core/placeholder/common'
import { CanNotResolve } from '../../../core/placeholder/common'
import { formatNumberOptions, formatStringOptions } from '../../../core/placeholder/utility'
import Duration from '../../../utility/duration'
import { DefaultCommandFooter } from '../common/discord-config'
import { interactivePaging } from '../utility/discord-pager'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('placeholder')
      .setDescription('Manage and help with placeholders')
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('help')
          .setDescription('Show all existing placeholders and their options')
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('format')
          .setDescription('Test a placeholder text')
          .addStringOption((o) =>
            o.setName('query').setDescription('the query to format and replace the placeholders').setRequired(true)
          )
      ),

  handler: async function (context) {
    switch (context.interaction.options.getSubcommand(true)) {
      case 'help': {
        await help(context)
        break
      }

      case 'format': {
        await format(context)
        break
      }
    }
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function help(context: DiscordCommandContext) {
  let helpBody = '# Placeholders Tutorial\n\n'

  helpBody +=
    '## Syntax' +
    '\nPlaceholders must be enclosed with parentheses. Example: `{{USERNAME}}`.' +
    '\nPlaceholders can have fallback variables in case the previous one fails. Example: `{{USERNAME | DISPLAY_NAME}}`.' +
    '\nPlaceholders can be a **constant value** that always resolve to the exact word. Example: `{{"HelloWorld"}}`' +
    '\nAll placeholders are predefined. Using non-existing one will return the same exact word. Example: `{{UNKNOWN_PLACEHOLDER}}` will resolve as `UNKNOWN_PLACEHOLDER`' +
    '\nPlaceholders can have options. Example: `{{USERNAME:uppercase | "unknown"}}}`'

  helpBody +=
    '\n\n## Tips' +
    '\nSome placeholders may fail to resolve their value if the value does not exist.' +
    ' For example, if the placeholder is for Mojang username but the user does not have a Mojang profile linked.' +
    ' To mitigate this problem, it is recommended to add a fallback **constant value** that always resolves to prevent a total failure. Example: `{{USERNAME | "unknown"}}`.' +
    '\nMultiple fallback placeholders can be chained together in case the previous ones fail. Example: `{{USERNAME | DISPLAY_NAME | ... | "unknown"}}`.'

  helpBody +=
    '\n\n## All text options\n' +
    formatStringOptions()
      .map((option) => `\`${option.key}\`: ${escapeMarkdown(option.description)}`)
      .join('\n') +
    '\n\n## All number options\n' +
    formatNumberOptions()
      .map((option) => `\`${option.key}\`: ${escapeMarkdown(option.description)}`)
      .join('\n')

  const message = await context.interaction.reply({
    content: helpBody,
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            label: 'All Placeholders',
            style: ButtonStyle.Primary,
            customId: 'show-allPlaceholders'
          }
        ]
      }
    ]
  })

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: Duration.minutes(15).toMilliseconds()
  })

  collector.on('collect', (interaction) => {
    if (interaction.customId === 'show-allPlaceholders') {
      void handlePlaceholderOptionsList(context, interaction).catch(
        context.errorHandler.promiseCatch('sending all placeholder keywords')
      )
    }
  })
}

async function handlePlaceholderOptionsList(context: DiscordCommandContext, interaction: ButtonInteraction) {
  await interaction.deferReply()

  return await interactivePaging(
    interaction,
    0,
    Duration.minutes(15).toMilliseconds(),
    context.errorHandler,
    (page) => {
      const EntriesPerPage = 10
      const allHandlers = context.application.core.placeHolder.allResolvers()

      const entries = allHandlers.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
      const totalPages = Math.ceil(allHandlers.length / EntriesPerPage)

      return {
        totalPages: totalPages,
        embed: {
          title: `Placeholders (${page + 1} out of ${Math.max(totalPages, 1)})`,
          description: entries.map((entry) => `- \`${entry.keyword()}\`: ${entry.description()}`).join('\n'),
          footer: { text: DefaultCommandFooter }
        }
      }
    }
  )
}

async function format(context: DiscordCommandContext) {
  assert.ok(context.interaction.inCachedGuild())

  await context.interaction.deferReply()

  const user = await context.application.core.initializeDiscordUser(
    context.application.discordInstance.profileByUser(context.interaction.user, context.interaction.member),
    { guild: context.interaction.guild }
  )

  const placeholderContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(5).toMilliseconds(),
    cachedPlaceholders: new Map<string, string>(),
    customPlaceholders: {},
    throwOnAnyFail: false,
    user: user
  } satisfies PlaceholderContext

  const query = context.interaction.options.getString('query', true)

  try {
    const result = await context.application.core.placeHolder.resolvePlaceholder(placeholderContext, query)
    await context.interaction.editReply({
      embeds: [{ description: `\`${escapeMarkdown(query)}\`\n${result}`, footer: { text: DefaultCommandFooter } }]
    })
  } catch (error: unknown) {
    await (error instanceof CanNotResolve
      ? context.interaction.editReply({
          embeds: [
            {
              description: 'Can not fully resolve this. Adding fallback values can help.',
              color: Color.Info,
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
      : context.interaction.editReply({
          embeds: [
            {
              description: `Something went terribly wrong while trying to resolve this. Details: \`\`\`json\n${JSON.stringify(error, undefined, 2)}\`\`\``,
              color: Color.Info,
              footer: { text: DefaultCommandFooter }
            }
          ]
        }))
  }
}
