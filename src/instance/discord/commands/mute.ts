import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import type DiscordInstance from '../discord-instance'
import { getDuration } from '../../../util/shared-util'
import { InstanceType, PunishmentType } from '../../../common/application-event'

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

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    const time: string = interaction.options.getString('time', true)

    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g mute ${username} ${time}`)
    clientInstance.app.emit('punish', {
      localEvent: true,
      instanceType: InstanceType.DISCORD,
      instanceName: clientInstance.instanceName,

      name: username,
      type: PunishmentType.MUTE,
      till: Date.now() + getDuration(time),
      forgive: false
    })

    await interaction.editReply(`Command sent to mute ${username} for ${time}!`)
  }
} satisfies CommandInterface
