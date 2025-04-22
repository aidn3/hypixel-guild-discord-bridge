export interface GeneralConfig {
  hypixelApiKey: string
}

export interface DiscordConfig {
  key: string
  adminIds: string[]
}

export interface MetricsConfig {
  enabled: boolean
  port: number
  prefix: string
  useIngameCommand: boolean
  interval: number
}

export interface ApplicationConfig {
  version: number
  general: GeneralConfig
  discord: DiscordConfig
  metrics: MetricsConfig
  plugins: string[]
}
