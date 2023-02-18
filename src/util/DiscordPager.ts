import {
    ActionRowBuilder,
    APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    JSONEncodable,
    Message,
    TextBasedChannel,
    TextChannel
} from "discord.js";

enum Button {
    NEXT,
    BACK
}

export function pageMessage(interaction: CommandInteraction, pages: JSONEncodable<APIEmbed>[], duration = 60_000): Promise<Message> {
    let currentPage = 0
    let channel: TextBasedChannel = <TextChannel>interaction.channel

    const nextInteraction = channel.createMessageComponentCollector({
        filter: i => i.customId === `${interaction.id}-${Button.NEXT}` && i.user.id === interaction.user.id,
        time: duration
    })
    const backInteraction = channel.createMessageComponentCollector({
        filter: i => i.customId === `${interaction.id}-${Button.BACK}` && i.user.id === interaction.user.id,
        time: duration
    })

    let lastResponse = pages[currentPage]
    nextInteraction.on('collect', async i => {
        currentPage++
        lastResponse = pages[currentPage]

        await i.update({
            embeds: [lastResponse],
            // @ts-ignore
            components: [createButtons(interaction.id, currentPage, pages.length)]
        })
    })
    backInteraction.on('collect', async i => {
        currentPage--
        lastResponse = pages[currentPage]

        await i.update({
            embeds: [lastResponse],
            // @ts-ignore
            components: [createButtons(interaction.id, currentPage, pages.length)]
        })
    })

    nextInteraction.on('end', async () => {
        console.log('done collecting')
        await interaction.editReply({
            embeds: [lastResponse],
            components: []
        })
    })


    return interaction.editReply({
        embeds: [lastResponse],
        // @ts-ignore
        components: [createButtons(interaction.id, currentPage, pages.length)]
    })
}


function createButtons(interactionId: string, currentPage: number, totalPages: number) {
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
                .setDisabled(currentPage + 1 >= totalPages),
        ).toJSON()
}
