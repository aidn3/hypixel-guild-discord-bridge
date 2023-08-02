import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

const COMMAND: DiscordCommandInterface = {
    getCommandBuilder: () => new SlashCommandBuilder()
        .setName('demote')
        .setDescription('demote guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)) as SlashCommandBuilder,
    permission: Permission.HELPER,
    allowInstance: false,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let username = interaction.options.getString("username")
        clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g demote ${username}`)

        await interaction.editReply(`Command sent to demote ${username}!`)
    }
}

export default COMMAND
