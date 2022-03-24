const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('restart minecraft clients'),
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()
        let instances = clientInstance.bridge.minecraftInstances
        instances.forEach(i => i.connect())
        await interaction.editReply(`Restarted ${instances.length} clients!`)
    }
}
