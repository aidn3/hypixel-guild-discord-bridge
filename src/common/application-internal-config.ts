export interface ApplicationInternalConfig {
  discord: DiscordConfig
  commands: CommandsConfig
  moderation: ModerationConfig
  plugin: PluginConfig
  minecraft: MinecraftConfig
}

export interface MinecraftConfig {
  adminUsername: string
  instances: MinecraftInstanceConfig[]
}

export interface MinecraftInstanceConfig {
  name: string
  proxy: ProxyConfig | undefined
}

export interface ProxyConfig {
  host: string
  port: number
  protocol: ProxyProtocol
}

export enum ProxyProtocol {
  Http = 'http',
  Socks5 = 'socks5'
}

export interface PluginConfig {
  enabledPlugins: string[]
}

export enum OfficialPlugins {
  AutoRestart = 'auto-restart',
  DarkAuctionReminder = 'dark-auction-reminder',
  Limbo = 'limbo',
  Reaction = 'reaction',
  StarfallCultReminder = 'starfall-cult-reminder',
  Stuf = 'stuf',
  HideLinks = 'hide-links',
  Warp = 'warp'
}

export interface DiscordConfig {
  publicChannelIds: string[]
  officerChannelIds: string[]
  helperRoleIds: string[]
  officerRoleIds: string[]

  loggerChannelIds: string[]

  alwaysReplyReaction: boolean
}

export interface CommandsConfig {
  enabled: boolean
}

export interface ModerationConfig {
  heatPunishment: boolean
  mutesPerDay: number
  kicksPerDay: number
  immune: string[]
  profanity: ProfanityConfig
}

export interface ProfanityConfig {
  enabled: boolean
  whitelist: string[]
  blacklist: string[]
}

export const DefaultApplicationInternalConfig: ApplicationInternalConfig = {
  discord: {
    publicChannelIds: [],
    officerChannelIds: [],
    helperRoleIds: [],
    officerRoleIds: [],

    loggerChannelIds: [],

    alwaysReplyReaction: false
  },
  minecraft: { adminUsername: 'Steve', instances: [] },

  commands: { enabled: true },
  moderation: {
    heatPunishment: true,
    mutesPerDay: 10,
    kicksPerDay: 5,
    immune: [],
    profanity: {
      enabled: true,
      whitelist: ['sadist', 'hell', 'damn', 'god', 'shit', 'balls', 'retard'],
      blacklist: []
    }
  },

  plugin: {
    enabledPlugins: [
      OfficialPlugins.AutoRestart,
      OfficialPlugins.DarkAuctionReminder,
      OfficialPlugins.Limbo,
      OfficialPlugins.Reaction,
      OfficialPlugins.StarfallCultReminder
    ]
  }
}
