import assert from 'node:assert'

import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'
import type { Client, Status } from 'hypixel-api-reborn'

import type Application from '../../../application.js'
import type { MinecraftRawChatEvent } from '../../../common/application-event.js'
import { Color, InstanceType } from '../../../common/application-event.js'
import type { MojangApi, MojangProfile } from '../../../util/mojang.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { pageMessage } from '../discord-pager.js'

function createEmbed(instances: Map<string, string[]>): APIEmbed[] {
  const entries: string[] = []
  let total = 0

  for (const [instanceName, list] of instances) {
    total += list.length

    entries.push(`**${escapeMarkdown(instanceName)} (${list.length})**\n`)

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

  const MaxLength = 3900
  let currentLength = 0
  for (const entry of entries) {
    if (pages.length === 0 || currentLength + entry.length > MaxLength) {
      currentLength = 0

      pages.push({
        color: Color.Default,
        title: `Guild Online Players (${total}):`,
        description: '',
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
  getCommandBuilder: () => new SlashCommandBuilder().setName('list').setDescription('List Online Players'),
  permission: Permission.Anyone,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const instancesNames = context.application.clusterHelper.getInstancesNames(InstanceType.Minecraft)
    const lists: Map<string, string[]> = await listMembers(
      context.application,
      context.application.mojangApi,
      context.application.hypixelApi
    )

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await pageMessage(context.interaction, createEmbed(lists), context.errorHandler)
  }
} satisfies CommandInterface

async function listMembers(app: Application, mojangApi: MojangApi, hypixelApi: Client): Promise<Map<string, string[]>> {
  const onlineProfiles: Map<string, string[]> = await getOnlineMembers(app)

  for (const [instanceName, members] of onlineProfiles) {
    const fetchedMembers = await look(mojangApi, hypixelApi, unique(members))
    onlineProfiles.set(instanceName, fetchedMembers)
  }

  return onlineProfiles
}

async function look(mojangApi: MojangApi, hypixelApi: Client, members: string[]): Promise<string[]> {
  const onlineProfiles = await lookupProfiles(mojangApi, members)

  const statuses: (Status | undefined)[] = await Promise.all(
    onlineProfiles.resolved.map((profile) => hypixelApi.getStatus(profile.id).catch(() => undefined))
  )

  const list = []
  let resolvedIndex = 0
  for (const memberName of members) {
    if (onlineProfiles.failed.includes(memberName)) {
      list.push(formatLocation(memberName, undefined))
    } else {
      list.push(formatLocation(memberName, statuses[resolvedIndex++]))
    }
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
  for (let index = 0; index < usernames.length; index += chunk) {
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
  let message = `- **${escapeMarkdown(username)}** `

  if (session === undefined) return message + ' is *__unknown?__*'
  if (!session.online) return message + ' is *__offline?__*'

  message += '*' // START discord markdown. italic
  if (session.game != undefined) message += `playing __${escapeMarkdown(session.game.name)}__`
  if (session.mode != undefined) message += ` in ${escapeMarkdown(session.mode.toLowerCase())}`
  message += '*' // END discord markdown. italic

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

  app.on('minecraftChat', chatListener)
  app.clusterHelper.sendCommandToAllMinecraft('/guild online')
  await new Promise((resolve) => setTimeout(resolve, 3000))
  app.removeListener('minecraftChat', chatListener)

  return resolvedNames
}

function unique<T>(list: T[]): T[] {
  return list.filter(function (item, pos) {
    return list.indexOf(item) === pos
  })
}
