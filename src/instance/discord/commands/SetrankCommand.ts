// noinspection SpellCheckingInspection

import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

const COMMAND: DiscordCommandInterface = {
    getCommandBuilder: () => new SlashCommandBuilder()
        .setName('setrank')
        .setDescription('setrank guild member in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('rank to change to')
                .setRequired(true)) as SlashCommandBuilder,
    permission: Permission.HELPER,
    allowInstance: false,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let username = interaction.options.getString("username")
        // @ts-ignore
        let rank = interaction.options.getString("rank")

        clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g setrank ${username} ${rank}`)
        await interaction.editReply(`Command sent to setrank ${username} to ${rank}!`)
    }
}

export default COMMAND
