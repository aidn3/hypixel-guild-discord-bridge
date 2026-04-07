import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { DefaultCommandFooter } from '../common/discord-config'
import { pageMessage } from '../utility/discord-pager'

import FAQ from 'resources/faq.json'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('faq').setDescription('Show frequently asked questions'),
  handler: async function (context) {
    await context.interaction.deferReply()

    const pages: APIEmbed[] = []
    for (let index = 0; index < FAQ.length; index++) {
      const entry = FAQ[index]
      const page = {
        title: `FAQ ${index + 1} out of ${FAQ.length}`,
        description: `## ${entry.title}\n${entry.body}`,
        footer: { text: DefaultCommandFooter }
      } satisfies APIEmbed
      pages.push(page)
    }

    await pageMessage(context.interaction, pages, context.errorHandler, Duration.minutes(15).toMilliseconds())
  }
} satisfies DiscordCommandHandler
