import assert from 'node:assert'

import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder, userMention } from 'discord.js'
import type { Client, Status } from 'hypixel-api-reborn'

import type Application from '../../../application.js'
import { Color, InstanceType } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandScope } from '../../../common/commands.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { MojangApi } from '../../../utility/mojang.js'
import type { GuildFetch } from '../../users/features/guild-manager'
import type { Link, Verification } from '../../users/features/verification'
import { LinkType } from '../../users/features/verification'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { pageMessage } from '../utility/discord-pager.js'

function createEmbed(instances: Map<string, string[]>, onlyOnline: boolean): APIEmbed[] {
  const entries: string[] = []
  let total = 0

  for (const [guildName, list] of instances) {
    const players = list.filter((value) => value.startsWith('  - ')).length

    total += players

    entries.push(`**${escapeMarkdown(guildName)} (${players})**\n`)

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

  /*
    Max allowed characters length is 4000.
    Originally the variable was set to 3900 with 100 leeway for headers/etc.
    However, for some unknown bug, nearing the max length will result in weird artifacts and bugs
    trimming the end of the text when displayed on client side.
   */
  const MaxLength = 3300
  /*
   * Although still unknown, sometimes too many bullet points
   * create the weird client artifact.
   */
  const MaxCount = 150

  let currentLength = 0
  let currentCount = 0
  for (const entry of entries) {
    if (pages.length === 0 || currentLength + entry.length > MaxLength || currentCount >= MaxCount) {
      currentLength = 0
      currentCount = 0

      pages.push({
        color: Color.Default,
        title: onlyOnline ? `Guild Online Players (${total}):` : `Guild Players (${total}):`,
        description: '',
        footer: {
          text: DefaultCommandFooter
        }
      })
    }

    currentLength += entry.length
    currentLength++
    const lastPage = pages.at(-1)
    assert.ok(lastPage)
    lastPage.description += entry
  }

  return pages as APIEmbed[]
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .addSubcommand((subCommand) =>
        subCommand.setName('online').setDescription('List online players in your guild(s)')
      )
      .addSubcommand((subCommand) =>
        subCommand.setName('all').setDescription('List all players in your guild(s), even offline players')
      )
      .setName('list')
      .setDescription('List players in your guild(s)'),
  scope: CommandScope.Chat,

  handler: async function (context) {
    await context.interaction.deferReply()

    const onlyOnline = context.interaction.options.getSubcommand() === 'online'
    const lists: Map<string, string[]> = await listMembers(
      context.application,
      context.errorHandler,
      context.application.mojangApi,
      context.application.hypixelApi,
      onlyOnline
    )

    if (lists.size === 0) {
      await context.interaction.editReply({
        embeds: [
          {
            description:
              `No Minecraft instance exist.\n` +
              'This is a Minecraft command that requires a working Minecraft account connected to the bridge.\n' +
              `Check the tutorial on how to add a Minecraft account before using this command.`,
            color: Color.Info,
            footer: {
              text: DefaultCommandFooter
            }
          }
        ]
      })
      return
    }

    await pageMessage(context.interaction, createEmbed(lists, onlyOnline), context.errorHandler)
  }
} satisfies DiscordCommandHandler

async function listMembers(
  app: Application,
  errorHandler: UnexpectedErrorHandler,
  mojangApi: MojangApi,
  hypixelApi: Client,
  onlyOnline: boolean
): Promise<Map<string, string[]>> {
  const guildsLookup = await getGuilds(app, errorHandler)

  const allUsernames = new Set<string>()
  const onlineUsernames = new Set<string>()
  for (const guild of guildsLookup.fetched) {
    for (const member of guild.members) {
      allUsernames.add(member.username)
      if (!member.online) continue
      onlineUsernames.add(member.username.toLowerCase())
    }
  }

  const mojangProfiles = await mojangApi.profilesByUsername(allUsernames)
  const onlineMojangProfiles = new Map<string, string>()
  for (const [username, uuid] of mojangProfiles) {
    if (uuid === undefined) continue
    if (onlineUsernames.has(username.toLowerCase())) {
      onlineMojangProfiles.set(username, uuid)
    }
  }

  const statuses = await look(onlineMojangProfiles, hypixelApi, errorHandler)

  const result = new Map<string, string[]>()
  for (const failedInstanceName of guildsLookup.failed) {
    result.set(failedInstanceName, [])
  }
  for (const guild of guildsLookup.fetched) {
    let guildResult = result.get(guild.name)
    if (guildResult === undefined) {
      guildResult = []
      result.set(guild.name, guildResult)
    }

    const ranksOrder: string[] = []
    for (const member of guild.members) {
      if (!ranksOrder.includes(member.rank)) ranksOrder.push(member.rank)
    }

    const sortedMembers = guild.members.toSorted((a, b) => a.username.localeCompare(b.username))
    for (const currentRank of ranksOrder) {
      const guildTemporarilyResult: string[] = []
      for (const member of sortedMembers) {
        if (!member.online || member.rank !== currentRank) continue

        const link = await getVerification(app.usersManager.verification, mojangProfiles, member.username)
        const status = statuses.get(member.username.toLowerCase())
        guildTemporarilyResult.push(`  - ${formatLocation(member.username, link, status)}`)
      }
      if (!onlyOnline) {
        for (const member of sortedMembers) {
          if (member.online || member.rank !== currentRank) continue

          const link = await getVerification(app.usersManager.verification, mojangProfiles, member.username)
          guildTemporarilyResult.push(`  - ${formatUser(member.username, link)}`)
        }
      }

      if (guildTemporarilyResult.length > 0) {
        guildResult.push(`- **${escapeMarkdown(currentRank)}**`)
        guildResult.push(...guildTemporarilyResult)
      }
    }
  }

  return result
}

/*
  Map of username-status where username is always lowercased
 */
async function look(
  mojangProfiles: Map<string, string>,
  hypixelApi: Client,
  errorHandler: UnexpectedErrorHandler
): Promise<Map<string, Status>> {
  const result = new Map<string, Status>()

  const tasks: Promise<unknown>[] = []
  for (const [username, uuid] of mojangProfiles) {
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

async function getVerification(
  verification: Verification,
  mojangProfiles: Map<string, string | undefined>,
  username: string
): Promise<Link> {
  for (const [mojangUsername, uuid] of mojangProfiles) {
    if (mojangUsername.toLowerCase() !== username.toLowerCase()) continue
    if (uuid === undefined) return { type: LinkType.None }

    return verification.findByIngame(uuid)
  }

  return { type: LinkType.None }
}

function formatUser(username: string, link: Link): string {
  let message = `**${escapeMarkdown(username)}**`
  if (link.type === LinkType.Confirmed) message += ` (${userMention(link.link.discordId)})`

  return message
}

function formatLocation(username: string, link: Link, session: Status | undefined): string {
  let message = `${formatUser(username, link)} `

  if (session === undefined) return message + ' is *__unknown?__*'
  if (!session.online) return message + ' is *__offline?__*'

  message += '*' // START discord markdown. italic
  if (session.game != undefined) message += `playing __${escapeMarkdown(session.game.name)}__`
  if (session.mode != undefined) message += ` in ${escapeMarkdown(session.mode.toLowerCase())}`
  message += '*' // END discord markdown. italic

  return message
}

async function getGuilds(app: Application, errorHandler: UnexpectedErrorHandler): Promise<GuildsLookup> {
  const tasks: Promise<unknown>[] = []

  const result: GuildsLookup = { fetched: [], failed: [] }

  for (const instanceName of app.getInstancesNames(InstanceType.Minecraft)) {
    const task = app.usersManager.guildManager
      .list(instanceName)
      .then((guild) => {
        result.fetched.push(guild)
      })
      .catch((error: unknown) => {
        errorHandler.error('fetching guild info', error)
        result.failed.push(instanceName)
      })

    tasks.push(task)
  }

  await Promise.all(tasks)
  return result
}

interface GuildsLookup {
  fetched: GuildFetch[]
  failed: string[]
}
