const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Display basic info about the client.'),
    permission: 0, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        interaction.editReply(`This is a bridge that connects guild's discord server with it's guild chat while offering many features.\nThat way, you can chat with your friends within in-game from the discord.\nThe features of the bot can be viewed with /help.`)
    }
}
