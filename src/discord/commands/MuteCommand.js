const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('mute guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('duration to mute. Can use 1s, 1m, 1h, 1d')
                .setRequired(true)),
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        let time = interaction.options.getString("time")
        clientInstance.bridge.sendMinecraftCommand(`/g mute ${username} ${time}`)

        interaction.editReply(`Command sent to mute ${username} for ${time}!`)
    }
}
