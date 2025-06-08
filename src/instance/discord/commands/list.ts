import assert from 'node:assert'

import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'
import type { Client, Status } from 'hypixel-api-reborn'

import type Application from '../../../application.js'
import { Color, InstanceType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { MojangApi } from '../../../util/mojang.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { pageMessage } from '../util/discord-pager.js'

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
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Disabled,

  handler: async function (context) {
    await context.interaction.deferReply()

    const instancesNames = context.application.getInstancesNames(InstanceType.Minecraft)
    const lists: Map<string, string[]> = await listMembers(
      context.application,
      context.errorHandler,
      context.application.mojangApi,
      context.application.hypixelApi
    )

    for (const instancesName of instancesNames) {
      if (!lists.has(instancesName)) lists.set(instancesName, [])
    }

    await pageMessage(context.interaction, createEmbed(lists), context.errorHandler)
  }
} satisfies DiscordCommandHandler

async function listMembers(
  app: Application,
  errorHandler: UnexpectedErrorHandler,
  mojangApi: MojangApi,
  hypixelApi: Client
): Promise<Map<string, string[]>> {
  const onlineProfiles = await getOnlineMembers(app, errorHandler)

  const allUsernames = new Set<string>()
  for (const [, members] of onlineProfiles) {
    for (const section of members) {
      for (const username of section.usernames) {
        allUsernames.add(username)
      }
    }
  }
  const statuses = await look(mojangApi, hypixelApi, errorHandler, allUsernames)

  const result = new Map<string, string[]>()
  for (const [instanceName, members] of onlineProfiles) {
    let instance = result.get(instanceName)
    if (instance === undefined) {
      instance = []
      result.set(instanceName, instance)
    }

    for (const { rank, usernames } of members) {
      instance.push(`- **${escapeMarkdown(rank)}**`)
      for (const username of usernames) {
        const status = statuses.get(username.toLowerCase())
        instance.push(`  - ${formatLocation(username, status)}`)
      }
    }
  }

  return result
}

/*
  Map of username-status where username is always lowercased
 */
async function look(
  mojangApi: MojangApi,
  hypixelApi: Client,
  errorHandler: UnexpectedErrorHandler,
  members: Set<string>
): Promise<Map<string, Status>> {
  const result = new Map<string, Status>()
  const mojangProfiles = await mojangApi.profilesByUsername(members)

  const tasks: Promise<unknown>[] = []
  for (const [username, uuid] of mojangProfiles) {
    if (uuid === undefined) continue

    tasks.push(
      hypixelApi
        .getStatus(uuid)
        .then((status) => result.set(username.toLowerCase(), status))
        .catch(errorHandler.promiseCatch(`fetching hypixel status of ${uuid} for command /list`))
    )
  }

  await Promise.all(tasks)
  return result
}

function formatLocation(username: string, session: Status | undefined): string {
  let message = `**${escapeMarkdown(username)}** `

  if (session === undefined) return message + ' is *__unknown?__*'
  if (!session.online) return message + ' is *__offline?__*'

  message += '*' // START discord markdown. italic
  if (session.game != undefined) message += `playing __${escapeMarkdown(session.game.name)}__`
  if (session.mode != undefined) message += ` in ${escapeMarkdown(session.mode.toLowerCase())}`
  message += '*' // END discord markdown. italic

  return message
}

async function getOnlineMembers(
  app: Application,
  errorHandler: UnexpectedErrorHandler
): Promise<Map<string, { rank: string; usernames: Set<string> }[]>> {
  const resolvedNames = new Map<string, { rank: string; usernames: Set<string> }[]>()

  const tasks = app.getInstancesNames(InstanceType.Minecraft).map(async (instanceName) => {
    try {
      const members = await app.usersManager.guildManager.onlineMembers(instanceName)
      resolvedNames.set(instanceName, members)
    } catch (error: unknown) {
      errorHandler.promiseCatch('fetching members')(error)
      return
    }
  })

  await Promise.all(tasks)
  return resolvedNames
}
