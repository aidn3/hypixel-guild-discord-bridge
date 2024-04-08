import * as assert from "node:assert"
import { APIEmbed, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Client, Status } from "hypixel-api-reborn"
import DiscordInstance from "../DiscordInstance"
import { escapeDiscord } from "../../../util/DiscordMessageUtil"
import { DiscordCommandInterface, Permission } from "../common/DiscordCommandInterface"
import { LOCATION } from "../../../common/ClientInstance"
import { MinecraftRawChatEvent } from "../../../common/ApplicationEvent"
import Application from "../../../Application"
import { ColorScheme, DefaultCommandFooter } from "../common/DiscordConfig"
import { pageMessage } from "../../../util/DiscordPager"
import { MojangApi, MojangProfile } from "../../../util/Mojang"

function createEmbed(instances: Map<string, string[]>): APIEmbed[] {
  const entries: string[] = []
  let total = 0

  for (const [instanceName, list] of instances) {
    total += list.length

    entries.push(`**${escapeDiscord(instanceName)} (${list.length})**\n`)

    if (list.length > 0) {
      for (const user of list) {
        entries.push(user + "\n")
      }
    } else {
      entries.push("_Could not fetch information from this instance._\n")
    }

    entries[entries.length - 1] += "\n"
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
        description: "",
        footer: {
          text: DefaultCommandFooter
        }
      })
    }

    currentLength += entry.length
    const lastPage = pages.at(-1)
    assert(lastPage)
    lastPage.description += entry
  }

  return pages as APIEmbed[]
}

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName("list").setDescription("List Online Players"),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const instancesNames = clientInstance.app.clusterHelper.getInstancesNames(LOCATION.MINECRAFT)
    const lists: Map<string, string[]> = await listMembers(
      clientInstance.app,
      clientInstance.app.mojangApi,
      clientInstance.app.hypixelApi
    )

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await pageMessage(interaction, createEmbed(lists))
  }
} satisfies DiscordCommandInterface

const listMembers = async function (
  app: Application,
  mojangApi: MojangApi,
  hypixelApi: Client
): Promise<Map<string, string[]>> {
  const onlineProfiles: Map<string, string[]> = await getOnlineMembers(app)

  for (const [instanceName, members] of onlineProfiles) {
    const fetchedMembers = await look(mojangApi, hypixelApi, unique(members))
    onlineProfiles.set(instanceName, fetchedMembers)
  }

  return onlineProfiles
}

async function look(mojangApi: MojangApi, hypixelApi: Client, members: string[]): Promise<string[]> {
  const onlineProfiles = await lookupProfiles(mojangApi, members)

  onlineProfiles.resolved.sort((a, b) => a.name.localeCompare(b.name))
  onlineProfiles.failed.sort((a, b) => a.localeCompare(b))

  const statuses = await Promise.all(onlineProfiles.resolved.map((profile) => hypixelApi.getStatus(profile.id)))

  const list = []
  for (const [index, onlineProfile] of onlineProfiles.resolved.entries()) {
    list.push(formatLocation(onlineProfile.name, statuses[index]))
  }
  for (const failedToResolveUsername of onlineProfiles.failed) {
    list.push(formatLocation(failedToResolveUsername, undefined))
  }

  return list
}

// Mojang only allow up to 10 usernames per lookup
async function lookupProfiles(
  mojangApi: MojangApi,
  usernames: string[]
): Promise<{ resolved: MojangProfile[]; failed: string[] }> {
  const mojangRequests: Promise<MojangProfile[]>[] = []
  const failedRequests: string[] = []

  // https://stackoverflow.com/a/8495740
  const chunk = 10
  for (let index = 0, index_ = usernames.length; index < index_; index += chunk) {
    const array = usernames.slice(index, index + chunk)
    mojangRequests.push(
      mojangApi.profilesByUsername(array).catch(() => {
        failedRequests.push(...array)
        return []
      })
    )
  }

  const p = await Promise.all(mojangRequests)
  return {
    resolved: p.flat(),
    failed: failedRequests
  }
}

function formatLocation(username: string, session: Status | undefined): string {
  let message = `- **${escapeDiscord(username)}** `

  if (session === undefined) return message + " is *__unknown?__*"
  if (!session.online) return message + " is *__offline?__*"

  message += "*" // START discord markdown. italic
  if (session.game != undefined) message += `playing __${escapeDiscord(session.game.name)}__`
  if (session.mode != undefined) message += ` in ${escapeDiscord(session.mode.toLowerCase())}`
  message += "*" // END discord markdown. italic

  return message
}

async function getOnlineMembers(app: Application): Promise<Map<string, string[]>> {
  const resolvedNames = new Map<string, string[]>()
  const regexOnline = /(\w{3,16}) \u25CF/g

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.message.length === 0) return

    let match = regexOnline.exec(event.message)
    while (match != undefined) {
      let members = resolvedNames.get(event.instanceName)
      if (members == undefined) {
        members = []
        resolvedNames.set(event.instanceName, members)
      }
      members.push(match[1])
      match = regexOnline.exec(event.message)
    }
  }

  app.on("minecraftChat", chatListener)
  app.clusterHelper.sendCommandToAllMinecraft("/guild online")
  await new Promise((resolve) => setTimeout(resolve, 3000))
  app.removeListener("minecraftChat", chatListener)

  return resolvedNames
}

function unique<T>(list: T[]): T[] {
  return list.filter(function (item, pos) {
    return list.indexOf(item) === pos
  })
}
