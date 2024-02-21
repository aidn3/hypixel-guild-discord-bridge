import { Client, ClientOptions } from 'minecraft-protocol'
import { ProxyConfig } from '../../../common/ProxyInterface'

export default interface MinecraftConfig {
  instanceName: string
  bridgePrefix: string
  botOptions: { client: Client } & ClientOptions
  proxy: ProxyConfig | null
}
