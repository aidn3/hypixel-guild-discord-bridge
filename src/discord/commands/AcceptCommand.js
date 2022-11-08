const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('accept')
        .setDescription('accept a player to the guild if they have a join request in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)),
    allowInstance: true,
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        let command = `/g accept ${username}`

        let instance = interaction.options.getString("instance")
        if (instance) {
            clientInstance.app.minecraftInstances
                .filter(i => i.instanceName === instance)
                .forEach(i => i.send(command))
        } else {
            clientInstance.app.sendMinecraftCommand(command)
        }

        interaction.editReply(`Command sent to accept ${username}!`)
    }
}
