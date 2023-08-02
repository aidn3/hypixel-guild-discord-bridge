import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

const COMMAND: DiscordCommandInterface = {
    getCommandBuilder: () => new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Send signal to shutdown the bridge'),
    allowInstance: false,
    permission: Permission.ADMIN,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        clientInstance.app.emit("shutdownSignal", {
            localEvent: true,
            // null is used to set the command globally
            targetInstanceName: null
        })

        await interaction.editReply(
            'Shutdown signal has been sent.\n' +
            'It will take some time for the bridge to shut down.\n' +
            'Bridge will auto restart if a service monitor is used.'
        )
    }
}

export default COMMAND
