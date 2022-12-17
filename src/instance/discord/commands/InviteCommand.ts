import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('invite player to the guild in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)),
    allowInstance: true,
    permission: Permission.STAFF,
    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let username = interaction.options.getString("username")
        let command = `/g invite ${username}`

        // @ts-ignore
        let instance = interaction.options.getString("instance")
        if (instance) {
            clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
        } else {
            clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
        }

        await interaction.editReply(`Command sent to invite ${username}!`)
    }
}
