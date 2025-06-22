export interface PluginConfig {
  starfallCultReminder: boolean
  darkAuctionReminder: boolean
}

export enum OfficialPlugins {
  AutoRestart = 'auto-restart',
  DarkAuctionReminder = 'dark-auction-reminder',
  StarfallCultReminder = 'starfall-cult-reminder'
}
