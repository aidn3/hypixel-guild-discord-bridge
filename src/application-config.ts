export interface GeneralConfig {
  hypixelApiKey: string
}

export interface StaticDiscordConfig {
  key: string
  adminIds: string[]
}

export interface MetricsConfig {
  enabled: boolean
  port: number
  prefix: string
}

export interface ApplicationConfig {
  version: number
  general: GeneralConfig
  discord: StaticDiscordConfig
  metrics: MetricsConfig
  plugins: string[]
}
