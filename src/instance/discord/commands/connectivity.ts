import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type Application from '../../../application.js'
import type { MinecraftRawChatEvent } from '../../../common/application-event.js'
import { Color, InstanceType, MinecraftSendChatPriority } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandScope } from '../../../common/commands.js'
import { antiSpamString } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createEmbed(instances: Map<string, string[]>): APIEmbed {
  let content =
    '_An echo is sent to all Minecraft channels (Public, Officer, Private)_.\n' +
    '_Results are collected after. If a message is missing, it means there is a problem._\n' +
    'Possible reasons for not receiving a message:\n' +
    '- Bot not connected to the server\n' +
    '- Bot muted by the server/community\n' +
    '- Bot does not have permission to send/receive messages in that channel\n\n'

  for (const [instanceName, list] of instances) {
    content += `**${escapeMarkdown(instanceName)}**\n`

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
    color: Color.Default,
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

  scope: CommandScope.Chat,
  handler: async function (context) {
    await context.interaction.deferReply()

    const instancesNames = context.application.getInstancesNames(InstanceType.Minecraft)
    const lists: Map<string, string[]> = await checkConnectivity(context.application)

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await context.interaction.editReply({ embeds: [createEmbed(lists)] })
  }
} satisfies DiscordCommandHandler

async function checkConnectivity(app: Application): Promise<Map<string, string[]>> {
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

  const tasks: Promise<void>[] = [
    app.sendMinecraft(
      app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/ac ${queryWords[0]}`
    ),
    app.sendMinecraft(
      app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/gc ${queryWords[1]}`
    ),
    app.sendMinecraft(
      app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/oc ${queryWords[2]}`
    )
  ]

  for (const bot of app.minecraftManager.getMinecraftBots()) {
    const task = app.sendMinecraft(
      app.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/msg ${bot.username} ${queryWords[3]}`
    )

    tasks.push(task)
  }

  await Promise.all(tasks)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  app.removeListener('minecraftChat', chatListener)

  return receivedResponses
}
