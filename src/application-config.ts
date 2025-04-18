export interface GeneralConfig {
  hypixelApiKey: string
}

export interface DiscordConfig {
  key: string
  adminId: string
}

export interface MetricsConfig {
  enabled: boolean
  port: number
  prefix: string
  useIngameCommand: boolean
  interval: number
}

export interface ApplicationConfig {
  general: GeneralConfig
  discord: DiscordConfig
  metrics: MetricsConfig
  plugins: string[]
}
