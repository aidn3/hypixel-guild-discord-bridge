import type {
  APIEmbed,
  ButtonInteraction,
  CommandInteraction,
  Message,
  TextBasedChannel,
  TextChannel
} from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import { ColorScheme, DefaultCommandFooter } from './common/discord-config'

enum Button {
  NEXT = 'next',
  BACK = 'back'
}

export const DEFAULT_TIMEOUT = 60_000

const NO_EMBED: APIEmbed = {
  color: ColorScheme.ERROR,
  title: 'Nothing to display',
  description:
    'There is nothing to display.\n' +
    "This shouldn't happen.\n" +
    'The application returned an empty body.\n' +
    'This message is only displayed to inform you about the bug.',

  footer: {
    text: DefaultCommandFooter
  }
}

export async function interactivePaging(
  interaction: CommandInteraction,
  currentPage = 0,
  duration = DEFAULT_TIMEOUT,
  fetch: (page: number) => Promise<FetchPageResult> | FetchPageResult
): Promise<Message> {
  const channel: TextBasedChannel = interaction.channel as TextChannel
  let lastUpdate = await fetch(currentPage)

  if (lastUpdate.embed === undefined) {
    return await interaction.editReply({ embeds: [NO_EMBED] })
  }

  if (lastUpdate.totalPages > 1) {
    const nextInteraction = channel.createMessageComponentCollector({
      filter: (index) => index.customId === `${interaction.id}-${Button.NEXT}` && index.user.id === interaction.user.id,
      time: duration
    })
    const backInteraction = channel.createMessageComponentCollector({
      filter: (index) => index.customId === `${interaction.id}-${Button.BACK}` && index.user.id === interaction.user.id,
      time: duration
    })

    nextInteraction.on('collect', async (index: ButtonInteraction) => {
      await index.deferUpdate()
      lastUpdate = await fetch(++currentPage)
      if (lastUpdate.embed === undefined) {
        await interaction.editReply({ embeds: [NO_EMBED] })
        return
      }

      await index.editReply({
        embeds: [lastUpdate.embed],
        components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
      })
    })
    backInteraction.on('collect', async (index: ButtonInteraction) => {
      await index.deferUpdate()
      lastUpdate = await fetch(--currentPage)
      if (lastUpdate.embed === undefined) {
        await interaction.editReply({ embeds: [NO_EMBED] })
        return
      }

      await index.editReply({
        embeds: [lastUpdate.embed],
        components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
      })
    })

    nextInteraction.on('end', async () => {
      if (lastUpdate.embed === undefined) {
        await interaction.editReply({ embeds: [NO_EMBED] })
        return
      }

      await interaction.editReply({
        embeds: [lastUpdate.embed],
        components: []
      })
    })
  }

  return await interaction.editReply({
    embeds: [lastUpdate.embed],
    components: lastUpdate.totalPages > 1 ? [createButtons(interaction.id, currentPage, lastUpdate.totalPages)] : []
  })
}

export async function pageMessage(
  interaction: CommandInteraction,
  pages: APIEmbed[],
  duration = DEFAULT_TIMEOUT
): Promise<Message> {
  return await interactivePaging(interaction, 0, duration, (page) => {
    return { embed: pages[page], totalPages: pages.length }
  })
}

// discord library api doesn't export correct type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createButtons(interactionId: string, currentPage: number, totalPages: number): any {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${interactionId}-${Button.BACK}`)
        .setLabel('Back')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage <= 0),
      new ButtonBuilder()
        .setCustomId(`${interactionId}-${Button.NEXT}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage + 1 >= totalPages)
    )
    .toJSON()
}

export interface FetchPageResult {
  embed?: APIEmbed
  totalPages: number
}
