const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('unmute guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)),
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        clientInstance.bridge.sendMinecraftCommand(`/g unmute ${username}`)

        interaction.editReply(`Command sent to unmute ${username}!`)
    }
}
