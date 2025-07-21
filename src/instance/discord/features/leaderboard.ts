import assert from 'node:assert'

import type { APIEmbed, Client } from 'discord.js'
import { DiscordAPIError, escapeMarkdown, userMention } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { ConfigManager } from '../../../common/config-manager.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { formatTime } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type DiscordInstance from '../discord-instance.js'

export default class Leaderboard extends EventHandler<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly EntriesPerPage = 10

  private static readonly CheckUpdateEvery = 60 * 1000

  private static readonly DefaultUpdateEveryMinutes = 30
  private readonly config: ConfigManager<LeaderboardConfig>

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.config = new ConfigManager(application, logger, application.getConfigFilePath('discord-leaderboards.json'), {
      updateEveryMinutes: Leaderboard.DefaultUpdateEveryMinutes,
      messages30Days: [],
      online30Days: [],
      points30Days: []
    })

    setInterval(() => {
      void this.updateLeaderboards().catch(this.errorHandler.promiseCatch('updating the leaderboards'))
    }, Leaderboard.CheckUpdateEvery)
  }

  public getConfig(): ConfigManager<LeaderboardConfig> {
    return this.config
  }

  private async updateLeaderboards(): Promise<void> {
    // TODO: properly reference client
    // @ts-expect-error client is private variable
    const client = this.clientInstance.client
    assert.ok(client.isReady())

    await this.updateLeaderboard(client, this.config.data.messages30Days, (options) => this.getMessage30Days(options))
    await this.updateLeaderboard(client, this.config.data.online30Days, (options) => this.getOnline30Days(options))
    await this.updateLeaderboard(client, this.config.data.points30Days, (options) => this.getPoints30Days(options))
  }

  private async updateLeaderboard(
    client: Client<true>,
    entries: LeaderboardEntry[],
    generate: (entry: LeaderboardOptions) => Promise<{ embed: APIEmbed; totalPages: number }>
  ): Promise<void> {
    let cachedEmbed: APIEmbed | undefined = undefined
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]

      if (entry.lastUpdate + this.config.data.updateEveryMinutes * 60 * 1000 > Date.now()) continue
      this.logger.debug(`Updating leaderboard ${JSON.stringify(entry)}`)

      try {
        cachedEmbed =
          cachedEmbed ??
          (await generate({
            addFooter: false,
            addLastUpdateAt: true,
            page: 0
          }).then((leaderboard) => leaderboard.embed))
        assert.ok(cachedEmbed !== undefined)

        const shouldKeep = await this.update(client, entry, cachedEmbed)
        if (!shouldKeep) {
          entries.splice(index, 1)
          this.config.markDirty()
          index--
        }
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }
  }

  private async update(client: Client, entry: LeaderboardEntry, embed: APIEmbed): Promise<boolean> {
    try {
      const channel = await client.channels.fetch(entry.channelId)
      assert.ok(channel?.isSendable())

      const message = await channel.messages.fetch(entry.messageId)
      await message.edit({ embeds: [embed] })
      entry.lastUpdate = Date.now()
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError) {
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes
        switch (error.code) {
          case 10_003: {
            this.logger.warn(`Could not update leaderboard (deleted channel): ${JSON.stringify(entry)}`)
            this.logger.warn('This leaderboard will be dropped.')
            return false
          }
          case 10_008: {
            this.logger.warn(`Could not update leaderboard (deleted message): ${JSON.stringify(entry)}`)
            this.logger.warn('This leaderboard will be dropped.')
            return false
          }
          case 50_001: {
            this.logger.error(
              `Application does not have permission to access the leaderboard: ${JSON.stringify(entry)}`
            )
            return true
          }
          // No default
        }
      }
    }

    return true
  }

  public async getMessage30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    const leaderboard = this.application.usersManager.scoresManager.getMessages30Days()
    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.count).reduce((previous, current) => previous + current)

    let description = option.addLastUpdateAt ? `Last update: <t:${Math.floor(Date.now() / 1000)}:R>\n` : ''
    description +=
      leaderboard.length > 0 ? `Total messages: **${total.toLocaleString('en-US')}**\n\n` : '(empty leaderboard!)'

    const chunk = leaderboard.slice(
      Leaderboard.EntriesPerPage * option.page,
      Leaderboard.EntriesPerPage * (option.page + 1)
    )
    for (const [index, entry] of chunk.entries()) {
      const position = option.page * Leaderboard.EntriesPerPage + index + 1
      const displayName = await this.application.mojangApi
        .profileByUuid(entry.uuid)
        .then((profile) => profile.name)
        .catch(() => entry.uuid)
      let formatted = `${this.getEmoji(position)} • ${position} ${escapeMarkdown(displayName)}`
      if (entry.discordId !== undefined) formatted += ` (${userMention(entry.discordId)})`
      formatted += ` **${entry.count.toLocaleString('en-US')}** messages`

      description += formatted + '\n'
    }

    const embed: APIEmbed = {
      title: 'Messages Leaderboard (30 days)',
      description: description
    }
    if (option.addFooter) Object.assign(embed, { footer: { text: DefaultCommandFooter } } satisfies APIEmbed)

    return { embed: embed, totalPages: Math.ceil(leaderboard.length / Leaderboard.EntriesPerPage) }
  }

  public async getOnline30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    const leaderboard = this.application.usersManager.scoresManager.getOnline30Days()
    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.totalTime).reduce((previous, current) => previous + current)

    let description = option.addLastUpdateAt ? `Last update: <t:${Math.floor(Date.now() / 1000)}:R>\n` : ''
    description += leaderboard.length > 0 ? `Total time: **${formatTime(total * 1000)}**\n\n` : '(empty leaderboard!)'

    const chunk = leaderboard.slice(
      Leaderboard.EntriesPerPage * option.page,
      Leaderboard.EntriesPerPage * (option.page + 1)
    )
    for (const [index, entry] of chunk.entries()) {
      const position = option.page * Leaderboard.EntriesPerPage + index + 1
      const displayName = await this.application.mojangApi
        .profileByUuid(entry.uuid)
        .then((profile) => profile.name)
        .catch(() => entry.uuid)

      let formatted = `${this.getEmoji(position)} • ${position} ${escapeMarkdown(displayName)}`
      if (entry.discordId !== undefined) formatted += ` (${userMention(entry.discordId)})`
      formatted += ` **${formatTime(entry.totalTime * 1000)}**`

      description += formatted + '\n'
    }

    const embed: APIEmbed = {
      title: 'Online Leaderboard (30 days)',
      description: description
    }
    if (option.addFooter) Object.assign(embed, { footer: { text: DefaultCommandFooter } } satisfies APIEmbed)
    return { embed: embed, totalPages: Math.ceil(leaderboard.length / Leaderboard.EntriesPerPage) }
  }

  public async getPoints30Days(option: LeaderboardOptions): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    const leaderboard = this.application.usersManager.scoresManager.getPoints30Days()
    const total =
      leaderboard.length === 0
        ? 0
        : leaderboard.map((entry) => entry.total).reduce((previous, current) => previous + current)

    let description = option.addLastUpdateAt ? `Last update: <t:${Math.floor(Date.now() / 1000)}:R>\n` : ''
    description +=
      leaderboard.length > 0 ? `Total points: **${total.toLocaleString('en-US')}**\n\n` : '(empty leaderboard!)'

    const chunk = leaderboard.slice(
      Leaderboard.EntriesPerPage * option.page,
      Leaderboard.EntriesPerPage * (option.page + 1)
    )
    for (const [index, entry] of chunk.entries()) {
      const position = option.page * Leaderboard.EntriesPerPage + index + 1
      const displayName = await this.application.mojangApi
        .profileByUuid(entry.uuid)
        .then((profile) => profile.name)
        .catch(() => entry.uuid)
      let formatted = `${this.getEmoji(position)} • ${position} ${escapeMarkdown(displayName)}`
      if (entry.discordId !== undefined) formatted += ` (${userMention(entry.discordId)})`
      formatted += ` **${entry.total.toLocaleString('en-US')}** points`

      description += formatted + '\n'
    }

    const embed: APIEmbed = {
      title: 'Points Leaderboard (30 days)',
      description: description
    }
    if (option.addFooter) Object.assign(embed, { footer: { text: DefaultCommandFooter } } satisfies APIEmbed)

    return { embed: embed, totalPages: Math.ceil(leaderboard.length / Leaderboard.EntriesPerPage) }
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

export interface LeaderboardConfig {
  updateEveryMinutes: number
  messages30Days: LeaderboardEntry[]
  online30Days: LeaderboardEntry[]
  points30Days: LeaderboardEntry[]
}

interface LeaderboardEntry {
  lastUpdate: number
  channelId: string
  messageId: string
}

interface LeaderboardOptions {
  addFooter: boolean
  addLastUpdateAt: boolean
  page: number
}
