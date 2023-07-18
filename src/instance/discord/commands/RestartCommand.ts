import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('restart minecraft clients'),
    allowInstance: true,
    permission: Permission.STAFF,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        // @ts-ignore
        let targetInstance: string | null = interaction.options.getString("instance")
        clientInstance.app.emit("restartSignal", {
            localEvent: true,
            // null set again to ensure "undefined" never come back in case discord library changes it again
            targetInstanceName: targetInstance ?? null
        })
        await interaction.editReply(`Restart signal has been sent!`)
    }
}
