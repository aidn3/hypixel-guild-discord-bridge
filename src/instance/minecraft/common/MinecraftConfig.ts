import MineFlayer = require('mineflayer')
import { ProxyConfig } from '../../../common/ProxyInterface'

export default interface MinecraftConfig {
  instanceName: string
  adminUsername: string

  bridgePrefix: string
  commandPrefix: string
  disabledCommand: string[]

  // TODO: fix Client not exist
  // @ts-expect-error "MineFlayer.Client" not exist
  botOptions: { client: MineFlayer.Client } & Partial<MineFlayer.BotOptions>
  proxy: ProxyConfig | null
  customAuthOptions?: {
    identifier: string
    clientId: string
    redirectUri: string
    initialRefreshToken: string // This is invalidated immediately after first launch
  }
}
