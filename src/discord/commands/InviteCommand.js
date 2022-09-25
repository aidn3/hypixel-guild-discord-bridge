const {SlashCommandBuilder} = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('invite player to the guild in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)),
    allowInstance: true,
    permission: 1, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let username = interaction.options.getString("username")
        let command = `/g invite ${username}`

        let instance = interaction.options.getString("instance")
        if (instance) {
            clientInstance.app.minecraftInstances
                .filter(i => i.instanceName === instance)
                .forEach(i => i.send(command))
        } else {
            clientInstance.app.sendMinecraftCommand(command)
        }

        interaction.editReply(`Command sent to invite ${username}!`)
    }
}
