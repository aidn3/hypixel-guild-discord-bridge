import { type APIEmbed, EmbedBuilder } from 'discord.js'

import { Color } from '../../../common/application-event.js'

import { DefaultCommandFooter } from './discord-config.js'

/**
 * Base styled embed with consistent footer and color
 */
export class StyledEmbed extends EmbedBuilder {
  constructor() {
    super()

    this.setColor(Color.Default)
    this.setFooter({
      text: DefaultCommandFooter
    })
    this.setTimestamp()
  }
}

/**
 * Success embed with green styling
 */
export class SuccessEmbed extends StyledEmbed {
  constructor(description: string, title?: string) {
    super()

    this.setColor(Color.Good)
    if (title) this.setTitle(`✅ ${title}`)
    else this.setAuthor({ name: '✅ Success' })
    this.setDescription(description)
  }
}

/**
 * Error embed with red styling
 */
export class ErrorEmbed extends StyledEmbed {
  constructor(description: string, title?: string) {
    super()

    this.setColor(Color.Bad)
    if (title) this.setTitle(`❌ ${title}`)
    else this.setAuthor({ name: '❌ Error' })
    this.setDescription(description)
  }
}

/**
 * Warning embed with yellow styling
 */
export class WarningEmbed extends StyledEmbed {
  constructor(description: string, title?: string) {
    super()

    this.setColor(Color.Info)
    if (title) this.setTitle(`⚠️ ${title}`)
    else this.setAuthor({ name: '⚠️ Warning' })
    this.setDescription(description)
  }
}

/**
 * Info embed with blue styling
 */
export class InfoEmbed extends StyledEmbed {
  constructor(description: string, title?: string) {
    super()

    this.setColor(Color.Info)
    if (title) this.setTitle(`ℹ️ ${title}`)
    else this.setAuthor({ name: 'ℹ️ Info' })
    this.setDescription(description)
  }
}

/**
 * Stats embed for player statistics with consistent formatting
 */
export class StatsEmbed extends StyledEmbed {
  constructor(playerName: string, gameTitle: string, stats: StatField[], options?: StatsEmbedOptions) {
    super()

    this.setTitle(`${options?.emoji ?? '📊'} ${gameTitle} - ${playerName}`)

    if (options?.thumbnail) {
      this.setThumbnail(options.thumbnail)
    }

    if (options?.description) {
      this.setDescription(options.description)
    }

    // Add stats as fields
    for (const stat of stats) {
      this.addFields({
        name: stat.name,
        value: stat.value.toString(),
        inline: stat.inline ?? true
      })
    }
  }
}

export interface StatField {
  name: string
  value: string | number
  inline?: boolean
}

export interface StatsEmbedOptions {
  emoji?: string
  thumbnail?: string
  description?: string
}

/**
 * Create a player stats embed with skin thumbnail
 */
export function createPlayerStatsEmbed(
  playerName: string,
  uuid: string,
  gameTitle: string,
  stats: StatField[],
  options?: Omit<StatsEmbedOptions, 'thumbnail'>
): APIEmbed {
  const embed = new StatsEmbed(playerName, gameTitle, stats, {
    ...options,
    thumbnail: `https://mc-heads.net/avatar/${uuid}/100`
  })
  return embed.toJSON()
}

/**
 * Create a simple text embed with Minecraft color code support
 */
export function createMinecraftEmbed(title: string, description: string): APIEmbed {
  // Convert Minecraft color codes to Discord formatting where possible
  const convertedDescription = description
    .replaceAll('§l', '**')
    .replaceAll('§o', '*')
    .replaceAll('§n', '__')
    .replaceAll('§r', '')
    .replaceAll(/§[0-9a-fk-o]/g, '') // Remove unsupported color codes

  return {
    color: Color.Default,
    title,
    description: convertedDescription,
    footer: { text: DefaultCommandFooter },
    timestamp: new Date().toISOString()
  }
}

/**
 * Create a guild info embed
 */
export function createGuildInfoEmbed(
  guildName: string,
  tag: string | null,
  level: number,
  members: number,
  weeklyGexp: number,
  createdAt: Date
): APIEmbed {
  return {
    color: Color.Default,
    title: `🏆 ${guildName}${tag ? ` [${tag}]` : ''}`,
    fields: [
      { name: 'Level', value: level.toString(), inline: true },
      { name: 'Members', value: `${members}/125`, inline: true },
      { name: 'Weekly GEXP', value: weeklyGexp.toLocaleString(), inline: true },
      { name: 'Created', value: `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`, inline: true }
    ],
    footer: { text: DefaultCommandFooter },
    timestamp: new Date().toISOString()
  }
}
