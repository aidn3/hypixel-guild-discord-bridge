import type { APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type DiscordInstance from '../discord-instance'
import { escapeDiscord } from '../../../util/discord-message-util'
import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import type { MinecraftRawChatEvent } from '../../../common/application-event'
import { InstanceType } from '../../../common/application-event'
import type Application from '../../../application'
import { ColorScheme, DefaultCommandFooter } from '../common/discord-config'
import { antiSpamString } from '../../../util/shared-util'

function createEmbed(instances: Map<string, string[]>): APIEmbed {
  let content =
    '_An echo is sent to all Minecraft channels (Public, Officer, Private)_.\n' +
    '_Results are collected after. If a message is missing, it means there is a problem._\n' +
    'Possible reasons for not receiving a message:\n' +
    '- Bot not connected to the server\n' +
    '- Bot muted by the server/community\n' +
    '- Bot does not have permission to send/receive messages in that channel\n\n'

  for (const [instanceName, list] of instances) {
    content += `**${escapeDiscord(instanceName)}**\n`

    if (list.length > 0) {
      content += '```'
      for (const response of list) {
        content += response + '\n'
      }
      content += '```'
    } else {
      content += '_Could not fetch information from this instance._\n'
    }

    content += '\n'
  }

  return {
    color: ColorScheme.DEFAULT,
    title: `Mute/Connectivity Check`,
    description: content,
    footer: {
      text: DefaultCommandFooter
    }
  } as APIEmbed
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('connectivity').setDescription('Check connectivity to Minecraft instances'),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const instancesNames = clientInstance.app.clusterHelper.getInstancesNames(InstanceType.MINECRAFT)
    const lists: Map<string, string[]> = await checkConnectivity(clientInstance.app)

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await interaction.editReply({ embeds: [createEmbed(lists)] })
  }
} satisfies CommandInterface

const checkConnectivity = async function (app: Application): Promise<Map<string, string[]>> {
  const receivedResponses = new Map<string, string[]>()
  const queryWords = [
    `Testing Connectivity 1 - @${antiSpamString()}`,
    `Testing Connectivity 2 - @${antiSpamString()}`,
    `Testing Connectivity 3 - @${antiSpamString()}`,
    `Testing Connectivity 4 - @${antiSpamString()}`
  ]

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.message.length === 0) return

    if (queryWords.some((query) => event.message.includes(query))) {
      let responses = receivedResponses.get(event.instanceName)
      if (responses == undefined) {
        responses = []
        receivedResponses.set(event.instanceName, responses)
      }
      responses.push(event.message.trim())
    }
  }

  app.on('minecraftChat', chatListener)

  app.clusterHelper.sendCommandToAllMinecraft(`/ac ${queryWords[0]}`)
  app.clusterHelper.sendCommandToAllMinecraft(`/gc ${queryWords[1]}`)
  app.clusterHelper.sendCommandToAllMinecraft(`/oc ${queryWords[2]}`)
  for (const bot of app.clusterHelper.getMinecraftBots()) {
    app.clusterHelper.sendCommandToMinecraft(bot.instanceName, `/msg ${bot.username} ${queryWords[3]}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 5000))
  app.removeListener('minecraftChat', chatListener)

  return receivedResponses
}
