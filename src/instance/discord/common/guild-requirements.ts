import type { APIEmbed } from 'discord.js'
import { escapeMarkdown } from 'discord.js'

import type { GuildRequirementsThresholds } from '../../../application-config.js'
import type Application from '../../../application.js'
import { Color } from '../../../common/application-event.js'
import { getSelectedSkyblockProfileRaw } from '../../commands/common/utility.js'

import { DefaultCommandFooter } from './discord-config.js'

export interface GuildRequirementsStats {
  bedwarsStars: number
  bedwarsFKDR: number
  skywarsStars: number
  skywarsKDR: number
  duelsWins: number
  duelsWLR: number
  skyblockLevel: number
}

export interface GuildRequirementsCheck {
  displayName: string
  avatarId: string
  stats: GuildRequirementsStats
  meetsRequirements: boolean
}

export interface GuildRequirementsEmbedOptions {
  titlePrefix?: string
  description?: string
}

export async function checkGuildRequirements(
  application: Application,
  uuid: string,
  requirements: GuildRequirementsThresholds,
  fallbackName?: string
): Promise<GuildRequirementsCheck | undefined> {
  const player = await application.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
  if (!player) return undefined

  const bedwarsStars = player.stats?.bedwars?.level ?? 0
  const bedwarsFKDR = player.stats?.bedwars?.finalKDRatio ?? 0
  const skywarsStars = player.stats?.skywars?.level ?? 0
  const skywarsKDR = player.stats?.skywars?.KDRatio ?? 0
  const duelsWins = player.stats?.duels?.wins ?? 0
  const duelsWLR = player.stats?.duels?.WLRatio ?? 0

  const selectedProfile = await getSelectedSkyblockProfileRaw(application.hypixelApi, uuid).catch(() => undefined)
  const skyblockExperience = selectedProfile?.leveling?.experience ?? 0
  const skyblockLevel = skyblockExperience > 0 ? skyblockExperience / 100 : 0

  const meetsAnyRequirement = [
    requirements.skyblockLevel > 0 && skyblockLevel >= requirements.skyblockLevel,
    requirements.bedwarsStars > 0 && bedwarsStars >= requirements.bedwarsStars,
    requirements.bedwarsFKDR > 0 && bedwarsFKDR >= requirements.bedwarsFKDR,
    requirements.skywarsStars > 0 && skywarsStars >= requirements.skywarsStars,
    requirements.skywarsKDR > 0 && skywarsKDR >= requirements.skywarsKDR,
    requirements.duelsWins > 0 && duelsWins >= requirements.duelsWins,
    requirements.duelsWLR > 0 && duelsWLR >= requirements.duelsWLR
  ].some(Boolean)

  return {
    displayName: player.nickname ?? fallbackName ?? uuid,
    avatarId: uuid,
    stats: {
      bedwarsStars,
      bedwarsFKDR,
      skywarsStars,
      skywarsKDR,
      duelsWins,
      duelsWLR,
      skyblockLevel
    },
    meetsRequirements: meetsAnyRequirement
  }
}

export function createGuildRequirementsEmbed(
  data: GuildRequirementsCheck & { requirements: GuildRequirementsThresholds },
  options: GuildRequirementsEmbedOptions = {}
): APIEmbed {
  const baseTitle = `${escapeMarkdown(data.displayName)} ${
    data.meetsRequirements ? 'meets' : "doesn't meet"
  } guild requirements`
  const title = options.titlePrefix ? `${options.titlePrefix} ${baseTitle}` : baseTitle

  return {
    color: data.meetsRequirements ? Color.Good : Color.Bad,
    title,
    description: options.description,
    fields: [
      {
        name: 'Bedwars Stars',
        value: formatRequirement(data.stats.bedwarsStars, data.requirements.bedwarsStars),
        inline: true
      },
      {
        name: 'Skywars Stars',
        value: formatRequirement(data.stats.skywarsStars, data.requirements.skywarsStars),
        inline: true
      },
      {
        name: 'Duels Wins',
        value: formatRequirement(data.stats.duelsWins, data.requirements.duelsWins),
        inline: true
      },
      {
        name: 'Bedwars FKDR',
        value: formatRequirement(data.stats.bedwarsFKDR, data.requirements.bedwarsFKDR, 2),
        inline: true
      },
      {
        name: 'Skywars KDR',
        value: formatRequirement(data.stats.skywarsKDR, data.requirements.skywarsKDR, 2),
        inline: true
      },
      {
        name: 'Duels WLR',
        value: formatRequirement(data.stats.duelsWLR, data.requirements.duelsWLR, 2),
        inline: true
      },
      {
        name: 'Skyblock Level',
        value: formatRequirement(data.stats.skyblockLevel, data.requirements.skyblockLevel, 2),
        inline: true
      }
    ],
    thumbnail: {
      url: `https://www.mc-heads.net/avatar/${data.avatarId}`
    },
    footer: {
      text: DefaultCommandFooter
    }
  }
}

function formatRequirement(current: number, required: number, decimals = 0): string {
  const currentValue = formatNumber(current, decimals)
  const requiredValue = required > 0 ? formatNumber(required, decimals) : 'Disabled'
  return `${currentValue}/${requiredValue}`
}

function formatNumber(value: number, decimals: number): string {
  if (decimals > 0) return value.toFixed(decimals)
  return Math.floor(value).toLocaleString()
}
