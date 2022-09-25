const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('restart minecraft clients'),
    allowInstance: true,
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let activeInstances = clientInstance.app.minecraftInstances

        let targetInstance = interaction.options.getString("instance")
        if (targetInstance) {
            activeInstances = activeInstances
                .filter(i => i.instanceName === targetInstance)
        }
        activeInstances.forEach(i => i.connect())

        await interaction.editReply(`Restarted ${activeInstances.length} client(s)!`)
    }
}
