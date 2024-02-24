import {
  ActionRowBuilder,
  APIEmbed,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  Message,
  TextBasedChannel,
  TextChannel
} from 'discord.js'

enum Button {
  NEXT,
  BACK
}

export const DEFAULT_TIMEOUT = 60_000

export async function interactivePaging(
  interaction: CommandInteraction,
  currentPage = 0,
  duration = DEFAULT_TIMEOUT,
  fetch: (page: number) => Promise<FetchPageResult> | FetchPageResult
): Promise<Message> {
  const channel: TextBasedChannel = interaction.channel as TextChannel
  let lastUpdate = await fetch(currentPage)

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
    await index.editReply({
      embeds: [lastUpdate.embed],
      components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
    })
  })
  backInteraction.on('collect', async (index: ButtonInteraction) => {
    await index.deferUpdate()
    lastUpdate = await fetch(--currentPage)
    await index.editReply({
      embeds: [lastUpdate.embed],
      components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
    })
  })

  nextInteraction.on('end', async () => {
    console.log('done collecting')
    await interaction.editReply({
      embeds: [lastUpdate.embed],
      components: []
    })
  })

  return await interaction.editReply({
    embeds: [lastUpdate.embed],
    components: [createButtons(interaction.id, currentPage, lastUpdate.totalPages)]
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
  embed: APIEmbed
  totalPages: number
}
