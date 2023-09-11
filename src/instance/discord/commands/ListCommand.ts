import DiscordInstance from '../DiscordInstance'
import { escapeDiscord } from '../../../util/DiscordMessageUtil'
import { APIEmbed, CommandInteraction, JSONEncodable, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import { LOCATION } from '../../../common/ClientInstance'
import { MinecraftRawChatEvent } from '../../../common/ApplicationEvent'
import Application from '../../../Application'
import { Client, Status } from 'hypixel-api-reborn'
import { ColorScheme, DefaultCommandFooter } from '../common/DiscordConfig'
import { pageMessage } from '../../../util/DiscordPager'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mojang = require('mojang')

function createEmbed (instances: Map<string, string[]>): Array<JSONEncodable<APIEmbed>> {
  const entries: string[] = []
  let total = 0

  for (const [instanceName, list] of instances) {
    total += list.length

    entries.push(`**${escapeDiscord(instanceName)} (${list.length})**\n`)

    if (list.length > 0) {
      for (const user of list) {
        entries.push(user + '\n')
      }
    } else {
      entries.push('_Could not fetch information from this instance._\n')
    }

    entries[entries.length - 1] += '\n'
  }

  const pages = []

  const MAX_LENGTH = 3900
  let currentLength = 0
  for (const entry of entries) {
    if (pages.length === 0 || currentLength + entry.length > MAX_LENGTH) {
      currentLength = 0

      pages.push({
        color: ColorScheme.DEFAULT,
        title: `Guild Online Players (${total}):`,
        description: '',
        footer: {
          text: DefaultCommandFooter
        }
      })
    }

    currentLength += entry.length
    pages[pages.length - 1].description += entry
  }

  return pages as any as Array<JSONEncodable<APIEmbed>>
}

export default {
  getCommandBuilder: () => new SlashCommandBuilder()
    .setName('list')
    .setDescription('List Online Players'),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    const instancesNames = clientInstance.app.clusterHelper.getInstancesNames(LOCATION.MINECRAFT)
    const lists: Map<string, string[]> = await listMembers(clientInstance.app, clientInstance.app.hypixelApi)

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await pageMessage(interaction, createEmbed(lists))
  }
} satisfies DiscordCommandInterface

const listMembers = async function (app: Application, hypixelApi: Client): Promise<Map<string, string[]>> {
  const onlineProfiles: Map<string, string[]> = await getOnlineMembers(app)

  for (const [instanceName, members] of onlineProfiles) {
    const fetchedMembers = await look(hypixelApi, unique(members))
    onlineProfiles.set(instanceName, fetchedMembers)
  }

  return onlineProfiles
}

async function look (hypixelApi: Client, members: string[]): Promise<string[]> {
  const onlineProfiles = await lookupProfiles(members)
    .then(profiles => profiles.sort((a, b) => a.name.localeCompare(b.name)))

  const statuses = await Promise.all(onlineProfiles.map(async profile => await hypixelApi.getStatus(profile.id)))

  const list = []
  for (let i = 0; i < onlineProfiles.length; i++) {
    list.push(formatLocation(onlineProfiles[i].name, statuses[i]))
  }
  return list
}

// Mojang only allow up to 10 usernames per lookup
async function lookupProfiles (usernames: string[]): Promise<any[]> {
  const mojangRequests = []

  // https://stackoverflow.com/a/8495740
  let i
  let j
  let arr
  const chunk = 10
  for (i = 0, j = usernames.length; i < j; i += chunk) {
    arr = usernames.slice(i, i + chunk)
    mojangRequests.push(mojang.lookupProfiles(arr))
  }

  const p = await Promise.all(mojangRequests)
  return p.flatMap(arr => arr)
}

function formatLocation (username: string, session: Status): string {
  let message = `- **${escapeDiscord(username)}** `

  if (!session.online) return message + ' is *__offline?__*'

  message += '*' // START discord markdown. italic
  if (session.game != null) message += `playing __${escapeDiscord(session.game.name)}__`
  if (session.mode != null) message += ` in ${escapeDiscord(session.mode.toLowerCase())}`
  message += '*' // END discord markdown. italic

  return message
}

async function getOnlineMembers (app: Application): Promise<Map<string, string[]>> {
  const resolvedNames = new Map<string, string[]>()
  const regexOnline = /(\w{3,16}) \u25CF/g

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.message.length === 0) return

    let match = regexOnline.exec(event.message)
    while (match != null) {
      let members = resolvedNames.get(event.instanceName)
      if (members == null) {
        members = []
        resolvedNames.set(event.instanceName, members)
      }
      members.push(match[1])
      match = regexOnline.exec(event.message)
    }
  }

  app.on('minecraftChat', chatListener)
  app.clusterHelper.sendCommandToAllMinecraft('/guild online')
  await new Promise(resolve => setTimeout(resolve, 3000))
  app.removeListener('minecraftChat', chatListener)

  return resolvedNames
}

function unique<T> (list: T[]): T[] {
  return list.filter(function (item, pos) {
    return list.indexOf(item) === pos
  })
}
