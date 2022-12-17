import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('promote guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)),
    permission: Permission.STAFF,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let username = interaction.options.getString("username")
        clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g promote ${username}`)

        await interaction.editReply(`Command sent to promote ${username}!`)
    }
}
