// noinspection JSUnusedGlobalSymbols

import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

const COMMAND: DiscordCommandInterface = {
    getCommandBuilder: () => new SlashCommandBuilder()
        .setName('accept')
        .setDescription('accept a player to the guild if they have a join request in-game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username of the player')
                .setRequired(true)) as SlashCommandBuilder,
    allowInstance: true,
    permission: Permission.HELPER,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let username = interaction.options.getString("username")
        let command = `/g accept ${username}`

        // @ts-ignore
        let instance = interaction.options.getString("instance")
        if (instance) {
            clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
        } else {
            clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
        }

        await interaction.editReply(`Command sent to accept ${username}!`)
    }
}

export default COMMAND
