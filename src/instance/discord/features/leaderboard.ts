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
import { formatTime } from '../../../util/shared-util.js'
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
      online30Days: []
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
    assert(client.isReady())

    await this.updateMessages30Days(client)
    await this.updateOnline30Days(client)
  }

  private async updateMessages30Days(client: Client<true>): Promise<void> {
    for (let index = 0; index < this.config.data.messages30Days.length; index++) {
      const entry = this.config.data.messages30Days[index]

      if (entry.lastUpdate + this.config.data.updateEveryMinutes * 60 * 1000 > Date.now()) continue
      this.logger.debug(`Updating leaderboard ${JSON.stringify(entry)}`)

      try {
        const leaderboard = await this.getMessage30Days({ addLastUpdateAt: true, page: 0 })

        const shouldKeep = await this.update(client, entry, leaderboard.embed)
        if (!shouldKeep) {
          this.config.data.messages30Days.splice(index, 1)
          this.config.markDirty()
          index--
        }
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }
  }

  private async updateOnline30Days(client: Client<true>): Promise<void> {
    for (let index = 0; index < this.config.data.online30Days.length; index++) {
      const entry = this.config.data.online30Days[index]

      if (entry.lastUpdate + this.config.data.updateEveryMinutes * 60 * 1000 > Date.now()) continue
      this.logger.debug(`Updating leaderboard ${JSON.stringify(entry)}`)

      try {
        const leaderboard = await this.getOnline30Days({ addLastUpdateAt: true, page: 0 })

        const shouldKeep = await this.update(client, entry, leaderboard.embed)
        if (!shouldKeep) {
          this.config.data.online30Days.splice(index, 1)
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
      assert(channel?.isSendable())

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

  public async getMessage30Days(option: { addLastUpdateAt: boolean; page: number }): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    const leaderboard = this.application.usersManager.scoresManager.getMessages30Days()
    const total = leaderboard.map((entry) => entry.count).reduce((previous, current) => previous + current)

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
      description: description,
      footer: { text: DefaultCommandFooter }
    }

    return { embed: embed, totalPages: Math.ceil(leaderboard.length / Leaderboard.EntriesPerPage) }
  }

  public async getOnline30Days(option: { addLastUpdateAt: boolean; page: number }): Promise<{
    embed: APIEmbed
    totalPages: number
  }> {
    const leaderboard = this.application.usersManager.scoresManager.getOnline30Days()
    const total = leaderboard.map((entry) => entry.totalTime).reduce((previous, current) => previous + current)

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
      description: description,
      footer: { text: DefaultCommandFooter }
    }
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
}

interface LeaderboardEntry {
  lastUpdate: number
  channelId: string
  messageId: string
}
