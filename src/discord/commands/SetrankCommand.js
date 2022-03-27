const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrank')
        .setDescription('setrank guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('rank to change to')
                .setRequired(true)),
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        let rank = interaction.options.getString("rank")
        clientInstance.bridge.sendMinecraftCommand(`/g setrank ${username} ${rank}`)

        interaction.editReply(`Command sent to setrank ${username} to ${rank}!`)
    }
}
