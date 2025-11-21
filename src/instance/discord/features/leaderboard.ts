import assert from 'node:assert'

import type { APIEmbed, Client } from 'discord.js'
import { DiscordAPIError, escapeMarkdown, userMention } from 'discord.js'
import type { Guild } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { User } from '../../../common/user'
import type { LeaderboardEntry } from '../../../core/discord/discord-leaderboards'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config'
import type DiscordInstance from '../discord-instance.js'

export default class Leaderboard extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly EntriesPerPage = 10
  private static readonly CheckUpdateEvery = Duration.minutes(1)
  private static readonly UpdateEvery = Duration.minutes(30)

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    setInterval(() => {
      void this.updateLeaderboards().catch(this.errorHandler.promiseCatch('updating the leaderboards'))
    }, Leaderboard.CheckUpdateEvery.toMilliseconds())
  }

  private async updateLeaderboards(): Promise<void> {
    // TODO: properly reference client
    // @ts-expect-error client is private variable
    const client = this.clientInstance.client
    assert.ok(client.isReady())

    const DefaultOptions = { addFooter: false, addLastUpdateAt: true, page: 0, user: undefined }

    const entries = this.application.core.discordLeaderboards.getAll()
    const toDelete: string[] = []
    const toUpdate: { messageId: string; updatedAt: number }[] = []
    const cache = new Map<LeaderboardEntry['type'], APIEmbed>()

    for (const entry of entries) {
      if (entry.updatedAt + Leaderboard.UpdateEvery.toMilliseconds() > Date.now()) continue
      this.logger.debug(`Updating leaderboard ${JSON.stringify(entry)}`)

      try {
        let cachedEmbed: APIEmbed | undefined
        switch (entry.type) {
          case 'messages30Days': {
            cachedEmbed = cache.get('messages30Days')
            cachedEmbed ??= await this.getMessage30Days({ ...DefaultOptions, guildId: entry.guildId }).then(
              (response) => response.embed
            )
            break
          }

          case 'online30Days': {
            cachedEmbed = cache.get('online30Days')
            cachedEmbed ??= await this.getOnline30Days({ ...DefaultOptions, guildId: entry.guildId }).then(
              (response) => response.embed
            )
            break
          }
          case 'points30Days': {
            cachedEmbed = cache.get('points30Days')
            cachedEmbed ??= await this.getPoints30Days({ ...DefaultOptions, guildId: entry.guildId }).then(
              (response) => response.embed
            )
            break
          }
          default: {
            // entry.type is 'never' but that is why we are checking
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.logger.warn('Unknown Discord leaderboard type=' + entry.type + '. Skipping it...')
            continue
          }
        }
        assert.ok(cachedEmbed !== undefined)

        const { keep, updated } = await this.update(client, entry, cachedEmbed)
        if (!keep) {
          toDelete.push(entry.messageId)
        }
        if (updated) {
          toUpdate.push({ messageId: entry.messageId, updatedAt: Date.now() })
        }
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }

    if (toDelete.length > 0) {
      this.application.core.discordLeaderboards.remove(toDelete)
    }
    if (toUpdate.length > 0) {
      this.application.core.discordLeaderboards.updateTime(toUpdate)
    }
  }

  private async update(
    client: Client,
    entry: LeaderboardEntry,
    embed: APIEmbed
  ): Promise<{
    keep: boolean
    updated: boolean
  }> {
    try {
      const channel = await client.channels.fetch(entry.channelId)
      assert.ok(channel?.isSendable())

      const message = await channel.messages.fetch(entry.messageId)
      await message.edit({ embeds: [embed] })
      return { keep: true, updated: true }
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError) {
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes
        switch (error.code) {
          case 10_003: {
            this.logger.warn(`Could not update leaderboard (deleted channel): ${JSON.stringify(entry)}`)
            this.logger.warn('This leaderboard will be dropped.')
            return { keep: false, updated: false }
          }
          case 10_008: {
            this.logger.warn(`Could not update leaderboard (deleted message): ${JSON.stringify(entry)}`)
            this.logger.warn('This leaderboard will be dropped.')
            return { keep: false, updated: false }
          }
          case 50_001: {
            this.logger.error(
              `Application does not have permission to access the leaderboard: ${JSON.stringify(entry)}`
            )
            return { keep: true, updated: false }
          }
          // No default
        }
      }

      this.logger.error(error)
      return { keep: true, updated: false }
    }
  }

  public async getMessage30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    let leaderboard = this.application.core.scoresManager.getMessages30Days()
    let result = ''

    if (option.guildId !== undefined) {
      const guild = await this.application.hypixelApi.getGuild('id', option.guildId)

      leaderboard = this.limitToGuild(leaderboard, guild, (uuid) => ({ uuid: uuid, discordId: undefined, count: 0 }))
      result += `Guild: **${escapeMarkdown(guild.name)}**\n`
    }

    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.count).reduce((previous, current) => previous + current)
    result += Leaderboard.addTimers(0)
    result += `Total messages: **${total.toLocaleString('en-US')}**\n\n`
    result += await this.createEntries(
      leaderboard,
      option.page,
      option.user,
      (entry) => `**${entry.count.toLocaleString('en-US')}** messages`
    )

    return {
      embed: {
        title: 'Messages Leaderboard (30 days)',
        description: result,
        footer: option.addFooter ? { text: DefaultCommandFooter } : undefined
      },
      totalPages: Leaderboard.totalPages(leaderboard)
    }
  }

  public async getOnline30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    let leaderboard = this.application.core.scoresManager.getOnline30Days()
    let result = ''

    if (option.guildId !== undefined) {
      const guild = await this.application.hypixelApi.getGuild('id', option.guildId)
      leaderboard = this.limitToGuild(leaderboard, guild, (uuid) => ({
        uuid: uuid,
        discordId: undefined,
        totalTime: 0
      }))
      result += `Guild: **${escapeMarkdown(guild.name)}**\n`
    }

    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.totalTime).reduce((previous, current) => previous + current)

    result += Leaderboard.addTimers(0)
    result += `Total time: **${formatTime(total * 1000)}**\n\n`
    result += await this.createEntries(
      leaderboard,
      option.page,
      option.user,
      (entry) => `**${formatTime(entry.totalTime * 1000)}**`
    )

    return {
      embed: {
        title: 'Online Leaderboard (30 days)',
        description: result,
        footer: option.addFooter ? { text: DefaultCommandFooter } : undefined
      },
      totalPages: Leaderboard.totalPages(leaderboard)
    }
  }

  public async getPoints30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    let leaderboard = this.application.core.scoresManager.getPoints30Days()
    let result = ''

    if (option.guildId !== undefined) {
      const guild = await this.application.hypixelApi.getGuild('id', option.guildId)
      leaderboard = this.limitToGuild(leaderboard, guild, (uuid) => ({
        uuid: uuid,
        discordId: undefined,
        total: 0,
        commands: 0,
        chat: 0,
        online: 0
      }))
      result += `Guild: **${escapeMarkdown(guild.name)}**\n`
    }
    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.total).reduce((previous, current) => previous + current)

    result += Leaderboard.addTimers(0)
    result += `Total points: **${total.toLocaleString('en-US')}**\n\n`
    result += await this.createEntries(
      leaderboard,
      option.page,
      option.user,
      (entry) => `**${entry.total.toLocaleString('en-US')}** points`
    )

    return {
      embed: {
        title: 'Points Leaderboard (30 days)',
        description: result,
        footer: option.addFooter ? { text: DefaultCommandFooter } : undefined
      },
      totalPages: Leaderboard.totalPages(leaderboard)
    }
  }

  private limitToGuild<T extends { uuid: string }>(entries: T[], guild: Guild, createEntry: (uuid: string) => T): T[] {
    const guildMembers = new Set<string>()
    for (const member of guild.members) {
      guildMembers.add(member.uuid)
    }

    const remainingEntries: T[] = []
    for (const entry of entries) {
      if (guildMembers.has(entry.uuid)) {
        guildMembers.delete(entry.uuid)
        remainingEntries.push(entry)
      }
    }

    for (const guildMember of guildMembers) {
      const emptyEntry = createEntry(guildMember)
      remainingEntries.push(emptyEntry)
    }

    return remainingEntries
  }

  private static addTimers(nextReset: number): string {
    let result = ''

    result += `Last update: <t:${Math.floor(Date.now() / 1000)}:R>\n`
    if (nextReset > 0) result += `Next reset <t:${Math.floor(nextReset / 1000)}>\n`

    return result
  }

  private static totalPages(entries: unknown[]): number {
    return Math.ceil(entries.length / Leaderboard.EntriesPerPage)
  }

  private async createEntries<T extends LeaderboardFormatEntry>(
    entries: T[],
    page: number,
    user: User | undefined,
    format: (entry: T) => string
  ): Promise<string> {
    const chunk = entries.slice(Leaderboard.EntriesPerPage * page, Leaderboard.EntriesPerPage * (page + 1))
    if (chunk.length === 0) return '(empty leaderboard!)'

    let result = ''
    for (const [index, entry] of chunk.entries()) {
      const position = page * Leaderboard.EntriesPerPage + index + 1
      const displayName = await this.application.mojangApi
        .profileByUuid(entry.uuid)
        .then((profile) => profile.name)
        .catch(() => entry.uuid)
      let formatted = `${this.getEmoji(position)} • ${position} ${escapeMarkdown(displayName)}`
      if (entry.discordId !== undefined) formatted += ` (${userMention(entry.discordId)})`
      formatted += ` ${format(entry)}`

      result += formatted + '\n'
    }

    if (user !== undefined) {
      result += '\n'

      const mojangProfile = user.mojangProfile()
      const discordProfile = user.discordProfile()
      if (mojangProfile === undefined) {
        result += `_Link your Mojang account to track yourself in the leaderboard!_`
      } else {
        const index = entries.findIndex((entry) => entry.uuid === mojangProfile.id)

        if (index === -1) {
          result += `${this.getEmoji(0)} • 0 ${escapeMarkdown(mojangProfile.name)}`
          if (discordProfile?.id !== undefined) result += ` (${userMention(discordProfile.id)})`
          result += ' Nothing to show'
        } else {
          const entry = entries[index]
          assert.ok(entry.discordId == undefined || entry.discordId === discordProfile?.id)

          result += `${this.getEmoji(index + 1)} • ${index + 1} ${escapeMarkdown(mojangProfile.name)}`
          if (entry.discordId !== undefined) result += ` (${userMention(entry.discordId)})`
          result += ` ${format(entry)}`
        }
      }

      result += '\n'
    }

    return result
  }

  private getEmoji(position: number): string {
    switch (position) {
      case 1: {
        return ':first_place:'
      }
      case 2: {
        return ':second_place:'
      }
      case 3: {
        return ':third_place:'
      }
      default: {
        if (position >= 4 && position <= 5) return ':coin:'
        else if (position >= 6 && position <= 10) return ':hibiscus:'
      }
    }
    return ':four_leaf_clover:'
  }
}

interface LeaderboardOptions {
  addFooter: boolean
  addLastUpdateAt: boolean
  page: number
  guildId: string | undefined
  user: User | undefined
}

interface LeaderboardFormatEntry {
  uuid: string
  discordId: string | undefined
}
