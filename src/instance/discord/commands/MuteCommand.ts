import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'
import { getDuration } from '../../../util/SharedUtil'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('mute')
      .setDescription('mute guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('time').setDescription('duration to mute. Can use 1s, 1m, 1h, 1d').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    // @ts-expect-error "getString" not defined in command interaction for some reason
    const username: string = interaction.options.getString('username')
    // @ts-expect-error "getString" not defined in command interaction for some reason
    const time: string = interaction.options.getString('time')

    clientInstance.app.punishedUsers.mute(username, getDuration(time))
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g mute ${username} ${time}`)

    await interaction.editReply(`Command sent to mute ${username} for ${time}!`)
  }
} satisfies DiscordCommandInterface
