export interface GeneralConfig {
  hypixelApiKey: string
}

export interface DiscordConfig {
  instanceName: string
  key: string | null
  adminId: string

  publicChannelIds: string[]
  officerChannelIds: string[]
  helperRoleIds: string[]
  officerRoleIds: string[]
}

export interface MinecraftConfig {
  bridgePrefix: string
  instances: MinecraftInstanceConfig[]
}

export interface MinecraftInstanceConfig {
  instanceName: string
  email: string
  proxy: ProxyConfig | null
}

export interface CommandsConfig {
  enabled: boolean

  adminUsername: string
  commandPrefix: string
  disabledCommand: string[]
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

export interface MetricsConfig {
  enabled: boolean
  port: number
  prefix: string
  useIngameCommand: boolean
  interval: number
}

export interface SocketConfig {
  enabled: boolean
  key: string
  uri: string
  type: 'server' | 'client'
  port: number
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

export interface ApplicationConfig {
  general: GeneralConfig

  discord: DiscordConfig
  minecraft: MinecraftConfig
  loggers: string[]

  commands: CommandsConfig
  moderation: ModerationConfig
  metrics: MetricsConfig
  socket: SocketConfig

  plugins: string[]
}
