const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('kick player out of the guild in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('reason to kick the player')
                .setRequired(true)),
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        let reason = interaction.options.getString("reason")
        clientInstance.bridge.sendMinecraftCommand(`/g kick ${username} ${reason}`)

        interaction.editReply(`Command sent to kick ${username}!`)
    }
}
