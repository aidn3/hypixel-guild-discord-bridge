import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type { DiscordCommandInterface } from '../common/DiscordCommandInterface'
import { Permission } from '../common/DiscordCommandInterface'
import type DiscordInstance from '../DiscordInstance'
import { InstanceType, PunishmentType } from '../../../common/ApplicationEvent'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('unmute guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g unmute ${username}`)
    clientInstance.app.emit('punish', {
      localEvent: true,
      instanceType: InstanceType.DISCORD,
      instanceName: clientInstance.instanceName,

      name: username,
      type: PunishmentType.MUTE,
      till: 0,
      forgive: true
    })
    await interaction.editReply(`Command sent to unmute ${username}!`)
  }
} satisfies DiscordCommandInterface
