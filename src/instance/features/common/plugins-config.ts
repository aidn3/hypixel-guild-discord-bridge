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
