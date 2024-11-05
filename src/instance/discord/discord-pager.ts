import type {
  APIEmbed,
  ButtonInteraction,
  CommandInteraction,
  Message,
  TextBasedChannel,
  TextChannel
} from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import { Color } from '../../common/application-event.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import { DefaultCommandFooter } from './common/discord-config.js'

enum Button {
  Next = 'next',
  Back = 'back'
}

export const DefaultTimeout = 60_000

const NoEmbed: APIEmbed = {
  color: Color.Error,
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
  duration = DefaultTimeout,
  errorHandler: UnexpectedErrorHandler,
  fetch: (page: number) => Promise<FetchPageResult> | FetchPageResult
): Promise<Message> {
  const channel: TextBasedChannel = interaction.channel as TextChannel
  let lastUpdate = await fetch(currentPage)

  if (lastUpdate.embed === undefined) {
    return await interaction.editReply({ embeds: [NoEmbed] })
  }

  if (lastUpdate.totalPages > 1) {
    const nextInteraction = channel.createMessageComponentCollector({
      filter: (index) => index.customId === `${interaction.id}-${Button.Next}` && index.user.id === interaction.user.id,
      time: duration
    })
    const backInteraction = channel.createMessageComponentCollector({
      filter: (index) => index.customId === `${interaction.id}-${Button.Back}` && index.user.id === interaction.user.id,
      time: duration
    })

    nextInteraction.on('collect', (index: ButtonInteraction) => {
      void index
        .deferUpdate()
        .then(async () => {
          lastUpdate = await fetch(++currentPage)
          if (lastUpdate.embed === undefined) {
            await interaction.editReply({ embeds: [NoEmbed] })
            return
          }

          await index.editReply({
            embeds: [lastUpdate.embed],
            components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
          })
        })
        .catch(errorHandler.promiseCatch('pressing next button on discord-pager'))
    })
    backInteraction.on('collect', (index: ButtonInteraction) => {
      void index
        .deferUpdate()
        .then(async () => {
          lastUpdate = await fetch(--currentPage)
          if (lastUpdate.embed === undefined) {
            await interaction.editReply({ embeds: [NoEmbed] })
            return
          }

          await index.editReply({
            embeds: [lastUpdate.embed],
            components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
          })
        })
        .catch(errorHandler.promiseCatch('pressing back button on discord-pager'))
    })

    nextInteraction.on('end', () => {
      if (lastUpdate.embed === undefined) {
        void interaction
          .editReply({ embeds: [NoEmbed] })
          .catch(errorHandler.promiseCatch('handling discord-pager end event when no embed exists'))
        return
      }

      void interaction
        .editReply({ embeds: [lastUpdate.embed], components: [] })
        .catch(
          errorHandler.promiseCatch('handling discord-pager end event by setting last embed without paging buttons')
        )
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
  errorHandler: UnexpectedErrorHandler,
  duration = DefaultTimeout
): Promise<Message> {
  return await interactivePaging(interaction, 0, duration, errorHandler, (page) => {
    return { embed: pages[page], totalPages: pages.length }
  })
}

// discord library api doesn't export correct type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createButtons(interactionId: string, currentPage: number, totalPages: number): any {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${interactionId}-${Button.Back}`)
        .setLabel('Back')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage <= 0),
      new ButtonBuilder()
        .setCustomId(`${interactionId}-${Button.Next}`)
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
