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
}
