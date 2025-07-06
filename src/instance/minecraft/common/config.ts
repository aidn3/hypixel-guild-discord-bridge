export interface MinecraftInstanceConfig {
  name: string
  proxy: ProxyConfig | undefined
}

export interface ProxyConfig {
  host: string
  port: number
  user: string | undefined
  password: string | undefined
  protocol: ProxyProtocol
}

export enum ProxyProtocol {
  Http = 'http',
  Socks5 = 'socks5'
}

export interface MinecraftConfig {
  adminUsername: string
  instances: MinecraftInstanceConfig[]

  announceMutedPlayer: boolean

  joinGuildReaction: boolean
  leaveGuildReaction: boolean
  kickGuildReaction: boolean
}
