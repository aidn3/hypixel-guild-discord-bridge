import axios from 'axios'
import minecraftProtocol from 'minecraft-protocol'

const { ping: MinecraftPing } = minecraftProtocol

import type Application from '../application'
import type { HypixelUpdatesConfig } from '../application-config'
import { ChannelType, Color, InstanceType } from '../common/application-event'
import { Instance } from '../common/instance'
import Duration from '../utility/duration'
import { setIntervalAsync } from '../utility/scheduling'
import { sleep } from '../utility/shared-utility'

interface RssItem {
  title?: string
  link?: string
  guid?: string
  pubDate?: number
  description?: string
}

interface IncidentState {
  notified: boolean
  updates: Set<string>
}

export default class HypixelUpdates extends Instance<InstanceType.Utility> {
  private static readonly DefaultPollIntervalMinutes = 10
  private static readonly DefaultAlphaIntervalMinutes = 15
  private static readonly LookbackHours = 12
  private static readonly MessageDelayMs = 1500
  private static readonly AlphaPlayerThreshold = 10
  private static readonly AlphaCooldown = Duration.hours(1)
  private static readonly AlphaHost = 'alpha.hypixel.net'
  private static readonly AlphaPort = 25_565
  private static readonly AlphaProtocol = '1.8.9'

  private readonly newsKeys = new Set<string>()
  private readonly incidents = new Map<string, IncidentState>()
  private skyblockVersion: string | undefined
  private lastAlphaPlayerCount = 0
  private lastAlphaMessageAt = 0

  private readonly pollInterval: Duration
  private readonly alphaInterval: Duration

  constructor(application: Application) {
    super(application, 'hypixel-updates', InstanceType.Utility)

    this.pollInterval = HypixelUpdates.resolvePollInterval(this.application.getHypixelUpdatesConfig())
    this.alphaInterval = HypixelUpdates.resolveAlphaInterval(this.application.getHypixelUpdatesConfig())

    setIntervalAsync(
      async () => {
        await this.pollUpdates()
      },
      {
        delay: this.pollInterval,
        errorHandler: this.errorHandler.promiseCatch('polling hypixel updates')
      }
    )

    setIntervalAsync(
      async () => {
        await this.checkAlphaPlayerCount()
      },
      {
        delay: this.alphaInterval,
        errorHandler: this.errorHandler.promiseCatch('polling hypixel alpha player count')
      }
    )

    void this.checkHypixelNews(true).catch(this.errorHandler.promiseCatch('seeding hypixel news cache'))
    void this.checkAlphaPlayerCount().catch(this.errorHandler.promiseCatch('checking hypixel alpha player count'))
  }

  private async pollUpdates(): Promise<void> {
    const config = this.application.getHypixelUpdatesConfig()
    if (!config?.enabled) return

    if (this.isFlagEnabled(config.hypixelNews)) {
      await this.checkHypixelNews().catch(this.errorHandler.promiseCatch('checking hypixel news'))
    }
    if (this.isFlagEnabled(config.statusUpdates)) {
      await this.checkStatusUpdates().catch(this.errorHandler.promiseCatch('checking hypixel status updates'))
    }
    if (this.isFlagEnabled(config.skyblockVersion)) {
      await this.checkSkyblockVersion().catch(this.errorHandler.promiseCatch('checking skyblock version'))
    }
  }

  private async checkHypixelNews(firstRun = false): Promise<void> {
    const config = this.application.getHypixelUpdatesConfig()
    if (!config?.enabled || !this.isFlagEnabled(config.hypixelNews)) return

    const [newsItems, skyblockItems] = await Promise.all([
      this.fetchRss('https://hypixel.net/forums/news-and-announcements.4/index.rss'),
      this.fetchRss('https://hypixel.net/forums/skyblock-patch-notes.158/index.rss')
    ])

    const now = Date.now()
    const lookbackMs = Duration.hours(HypixelUpdates.LookbackHours).toMilliseconds()

    const items = [...newsItems, ...skyblockItems]
    for (const item of items) {
      const key = item.guid ?? item.link ?? item.title
      if (!key) continue
      if (this.newsKeys.has(key)) continue
      this.newsKeys.add(key)

      if (firstRun) continue
      if (item.pubDate && item.pubDate + lookbackMs < now) continue
      if (!item.title || !item.link) continue

      await this.broadcast(`[HYPIXEL UPDATE] ${item.title} | ${item.link}`, Color.Info)
      await sleep(HypixelUpdates.MessageDelayMs)
    }
  }

  private async checkStatusUpdates(): Promise<void> {
    const config = this.application.getHypixelUpdatesConfig()
    if (!config?.enabled || !this.isFlagEnabled(config.statusUpdates)) return

    const items = await this.fetchRss('https://status.hypixel.net/history.rss')
    const now = Date.now()
    const lookbackMs = Duration.hours(HypixelUpdates.LookbackHours).toMilliseconds()

    for (const item of items) {
      const title = item.title
      if (!title) continue

      if (item.pubDate && item.pubDate + lookbackMs < now) continue

      const incident = this.incidents.get(title) ?? { notified: false, updates: new Set<string>() }
      if (!incident.notified) {
        const link = item.link ?? 'https://status.hypixel.net'
        await this.broadcast(`[HYPIXEL STATUS] ${title} | ${link}`, Color.Info)
        incident.notified = true
        await sleep(HypixelUpdates.MessageDelayMs)
      }

      const updates = extractStatusUpdates(item.description ?? '')
      for (const update of updates) {
        if (incident.updates.has(update)) continue
        incident.updates.add(update)
        await this.broadcast(`[HYPIXEL STATUS UPDATE] ${title} | ${update}`, Color.Info)
        await sleep(HypixelUpdates.MessageDelayMs)
      }

      this.incidents.set(title, incident)
    }
  }

  private async checkSkyblockVersion(): Promise<void> {
    const config = this.application.getHypixelUpdatesConfig()
    if (!config?.enabled || !this.isFlagEnabled(config.skyblockVersion)) return

    const { data } = await axios.get<{ version?: string }>('https://api.hypixel.net/v2/resources/skyblock/skills', {
      timeout: 10_000
    })

    const version = data?.version
    if (!version) return

    if (this.skyblockVersion && this.skyblockVersion !== version) {
      await this.broadcast(
        `[HYPIXEL SKYBLOCK] Skyblock version has been updated to ${version}! Server restarts might occur!`,
        Color.Info
      )
    }

    this.skyblockVersion = version
  }

  private async checkAlphaPlayerCount(): Promise<void> {
    const config = this.application.getHypixelUpdatesConfig()
    if (!config?.enabled || !this.isFlagEnabled(config.alphaPlayerCount)) return

    const response = await MinecraftPing({
      host: HypixelUpdates.AlphaHost,
      port: HypixelUpdates.AlphaPort,
      version: HypixelUpdates.AlphaProtocol
    })

    const playerCount = 'players' in response ? response.players.online : response.playerCount
    if (!Number.isFinite(playerCount)) return

    const now = Date.now()
    if (
      playerCount > HypixelUpdates.AlphaPlayerThreshold &&
      this.lastAlphaPlayerCount <= HypixelUpdates.AlphaPlayerThreshold &&
      now - this.lastAlphaMessageAt >= HypixelUpdates.AlphaCooldown.toMilliseconds()
    ) {
      await this.broadcast(`[ALPHA] Alpha Hypixel is open, current player count: ${playerCount}`, Color.Info)
      this.lastAlphaMessageAt = now
    }

    this.lastAlphaPlayerCount = playerCount
  }

  private async fetchRss(url: string): Promise<RssItem[]> {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      timeout: 10_000,
      headers: {
        'User-Agent': 'hypixel-guild-discord-bridge'
      }
    })

    return parseRssItems(response.data)
  }

  private async broadcast(message: string, color: Color): Promise<void> {
    await this.application.emit('broadcast', {
      ...this.eventHelper.fillBaseEvent(),
      channels: [ChannelType.Public],
      color: color,
      user: undefined,
      message: message
    })
  }

  private isFlagEnabled(flag: boolean | undefined): boolean {
    return flag !== false
  }

  private static resolvePollInterval(config: HypixelUpdatesConfig | undefined): Duration {
    const minutes = config?.pollIntervalMinutes
    if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
      return Duration.minutes(HypixelUpdates.DefaultPollIntervalMinutes)
    }
    return Duration.minutes(minutes)
  }

  private static resolveAlphaInterval(config: HypixelUpdatesConfig | undefined): Duration {
    const minutes = config?.alphaCheckIntervalMinutes
    if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
      return Duration.minutes(HypixelUpdates.DefaultAlphaIntervalMinutes)
    }
    return Duration.minutes(minutes)
  }
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml))) {
    const itemXml = match[1]

    const title = extractTagValue(itemXml, 'title')
    const link = extractLink(itemXml)
    const guid = extractTagValue(itemXml, 'guid')
    const description = extractTagValue(itemXml, 'description') ?? extractTagValue(itemXml, 'content:encoded')
    const pubDateRaw =
      extractTagValue(itemXml, 'pubDate') ?? extractTagValue(itemXml, 'updated') ?? extractTagValue(itemXml, 'dc:date')

    const pubDateValue = pubDateRaw ? Date.parse(pubDateRaw) : Number.NaN
    const pubDate = Number.isFinite(pubDateValue) ? pubDateValue : undefined

    items.push({
      title: title ?? undefined,
      link: link ?? undefined,
      guid: guid ?? undefined,
      pubDate: pubDate,
      description: description ?? undefined
    })
  }

  return items
}

function extractTagValue(xml: string, tag: string): string | undefined {
  const escaped = escapeRegex(tag)
  const regex = new RegExp(String.raw`<${escaped}[^>]*>([\s\S]*?)</${escaped}>`, 'i')
  const match = regex.exec(xml)
  if (!match) return undefined
  const value = decodeHtmlEntities(stripCdata(match[1])).trim()
  return value.length > 0 ? value : undefined
}

function extractLink(xml: string): string | undefined {
  const link = extractTagValue(xml, 'link')
  if (link) return link

  const match = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(xml)
  if (!match) return undefined
  const value = decodeHtmlEntities(match[1]).trim()
  return value.length > 0 ? value : undefined
}

function extractStatusUpdates(description: string): string[] {
  if (!description) return []

  const text = stripHtml(description)
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isTimestampLine(line))
}

function isTimestampLine(line: string): boolean {
  if (/\bUTC\b/i.test(line) || /\bGMT\b/i.test(line)) return true
  if (/^\w{3,9}\s+\d{1,2},\s+\d{4}/.test(line)) return true
  if (/^\d{4}-\d{2}-\d{2}t/i.test(line)) return true
  if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(line)) return true
  return false
}

function stripHtml(value: string): string {
  const withBreaks = value
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<\/p>\s*<p>/gi, '\n')
    .replaceAll(/<\/p>/gi, '\n')
    .replaceAll(/<p>/gi, '')

  return decodeHtmlEntities(withBreaks.replaceAll(/<[^>]*>/g, '')).replaceAll('\r', '')
}

function stripCdata(value: string): string {
  return value.replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
}

function decodeHtmlEntities(value: string): string {
  return value.replaceAll(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }

    switch (entity) {
      case 'amp': {
        return '&'
      }
      case 'lt': {
        return '<'
      }
      case 'gt': {
        return '>'
      }
      case 'quot': {
        return '"'
      }
      case 'apos': {
        return "'"
      }
      case 'nbsp': {
        return ' '
      }
      default: {
        return match
      }
    }
  })
}

function escapeRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}
