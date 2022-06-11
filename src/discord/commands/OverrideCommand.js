const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('override')
        .setDescription('execute command to all clients in-game')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('command to execute. e.g. "/guild party"')
                .setRequired(true)),
    permission: 2, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let command = interaction.options.getString("command")
        clientInstance.app.sendMinecraftCommand(command)

        interaction.editReply(`Command executed: ${command}`)
    }
}
