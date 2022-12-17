import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('override')
        .setDescription('execute command to all clients in-game')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('command to execute. e.g. "/guild party"')
                .setRequired(true)),
    allowInstance: true,
    permission: Permission.ADMIN,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let command = interaction.options.getString("command")
        // @ts-ignore
        let instance = interaction.options.getString("instance")

        if (instance) {
            clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
        } else {
            clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
        }

        await interaction.editReply(`Command executed: ${command}`)
    }
}
