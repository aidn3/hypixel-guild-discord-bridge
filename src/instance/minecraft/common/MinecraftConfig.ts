import { Client, ClientOptions } from "minecraft-protocol"
import { ProxyConfig } from "../../../common/ProxyInterface"

export default interface MinecraftConfig {
  instanceName: string
  adminUsername: string

  bridgePrefix: string
  commandPrefix: string
  disabledCommand: string[]

  botOptions: { client: Client } & ClientOptions
  proxy: ProxyConfig | null
}
