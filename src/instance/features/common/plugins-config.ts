export interface PluginConfig {
  autoRestart: boolean
  starfallCultReminder: boolean
  darkAuctionReminder: boolean
}

export enum OfficialPlugins {
  AutoRestart = 'auto-restart',
  DarkAuctionReminder = 'dark-auction-reminder',
  StarfallCultReminder = 'starfall-cult-reminder'
}
