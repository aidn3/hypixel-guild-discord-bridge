export const ApplicationConfigVersion = 2

export interface GeneralConfig {
  hypixelApiKey: string
  urchinApiKey?: string //TODO: next config update, make this explicit. Use null if needed
  shareMetrics: boolean
}

export interface StaticDiscordConfig {
  key: string
  adminIds: string[]
}

export interface PrometheusConfig {
  enabled: boolean
  port: number
  prefix: string
}

export interface ApplicationConfig {
  version: 2 // typeof ApplicationConfigVersion
  general: GeneralConfig
  discord: StaticDiscordConfig
  prometheus: PrometheusConfig
}
