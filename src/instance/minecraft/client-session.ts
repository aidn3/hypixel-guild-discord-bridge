import type { Client } from 'minecraft-protocol'
import PrismarineChat from 'prismarine-chat'
import type { NBT } from 'prismarine-nbt'
import type { RegistryPc } from 'prismarine-registry'
import PrismarineRegistry from 'prismarine-registry'

export default class ClientSession {
  readonly client: Client

  readonly registry
  readonly prismChat

  silentQuit = false

  constructor(client: Client) {
    this.client = client

    this.registry = PrismarineRegistry(client.version) as RegistryPc
    this.prismChat = PrismarineChat(this.registry)

    this.listenForRegistry(client)
    this.listenForSettings(client)
  }

  /*
   * Used to create special minecraft data.
   * Main purpose is to receive signed chat messages
   * and to be able to format them based on how the server decides
   */
  private listenForRegistry(client: Client): void {
    // 1.20.2+
    client.on('registry_data', (packet: { codec?: NBT; id?: string; entries?: unknown[] }) => {
      this.registry.loadDimensionCodec((packet.codec ?? packet) as NBT)
    })
    // older versions
    client.on('login', (packet: { dimensionCodec?: NBT }) => {
      if (packet.dimensionCodec) {
        this.registry.loadDimensionCodec(packet.dimensionCodec)
      }
    })
    client.on('respawn', (packet: { dimensionCodec?: NBT }) => {
      if (packet.dimensionCodec) {
        this.registry.loadDimensionCodec(packet.dimensionCodec)
      }
    })
  }

  private listenForSettings(client: Client): void {
    client.on('state', (newState: string) => {
      const supportFeature = (client as Client & Record<string, unknown>)._supportFeature as
        | ((name: string) => boolean)
        | undefined
      if (newState !== 'configuration' || supportFeature?.('hasConfigurationState') !== true) return

      client.write('settings', {
        locale: 'en_us',
        viewDistance: 8,
        chatFlags: 0,
        chatColors: true,
        skinParts: 0x7f,
        mainHand: 1,
        enableTextFiltering: false,
        enableServerListing: true,
        particleStatus: 'all'
      })
    })
  }
}
