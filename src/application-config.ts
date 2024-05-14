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

  deleteTempEventAfter: number
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

export interface ProfanityFilterConfig {
  enabled: boolean
  whitelisted: string[]
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
  HTTP = 'http',
  SOCKS5 = 'socks5'
}

export interface ApplicationConfig {
  general: GeneralConfig

  discord: DiscordConfig
  minecraft: MinecraftConfig
  loggers: string[]

  commands: CommandsConfig
  profanity: ProfanityFilterConfig
  metrics: MetricsConfig
  socket: SocketConfig

  plugins: string[]
}
