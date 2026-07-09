import MinecraftData from 'minecraft-data'
import type { Client } from 'minecraft-protocol'
import PrismarineChat from 'prismarine-chat'
import type { NBT } from 'prismarine-nbt'
import type { RegistryPc } from 'prismarine-registry'
import PrismarineRegistry from 'prismarine-registry'

export default class ClientSession {
  readonly client: Client

  readonly registry
  readonly prismChat
  private readonly indexedData

  silentQuit = false

  private destroyed = false

  constructor(client: Client) {
    this.client = client

    this.registry = PrismarineRegistry(client.version) as RegistryPc
    this.prismChat = PrismarineChat(this.registry)
    this.indexedData = MinecraftData(client.version)

    this.listenForRegistry(client)
    this.listenForSettings(client)
    this.listenForResourcePacks(client)
  }

  public isDestroyed(): boolean {
    return this.destroyed
  }

  public destroy(): void {
    this.client.removeAllListeners()
    this.destroyed = true
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
        viewDistance: 2,
        chatFlags: 0,
        chatColors: true,
        skinParts: 0,
        mainHand: 1,
        enableTextFiltering: false,
        enableServerListing: true,
        particleStatus: 2
      })
    })
  }

  // Based on https://github.com/PrismarineJS/mineflayer/blob/7368ac8e9cc8dc9800d611bd46b2548c8b8fe48d/lib/plugins/resource_pack.js
  private listenForResourcePacks(client: Client): void {
    const activeResourcePacks = new Set<string>()

    client.on('add_resource_pack', (data: { uuid: string }) => {
      activeResourcePacks.add(data.uuid)
      this.acceptResourcePackViaUuid(client, data.uuid)
    })
    client.on('resource_pack_send', (data: unknown) => {
      if (this.indexedData.supportFeature('resourcePackUsesUUID')) {
        const typedData = data as { uuid: string; url: string }
        activeResourcePacks.add(typedData.uuid)
        this.acceptResourcePackViaUuid(client, typedData.uuid)
      } else {
        const typedData = data as { hash: string; url: string }
        this.acceptResourcePackViaHash(client, typedData.hash)
      }
    })

    client.on('remove_resource_pack', (data: { uuid?: string }) => {
      if (data.uuid === undefined) {
        activeResourcePacks.clear()
      } else {
        activeResourcePacks.delete(data.uuid)
      }
    })
  }

  private acceptResourcePackViaUuid(client: Client, uuid: string) {
    client.write('resource_pack_receive', { uuid: uuid, result: ResourcePackResult.Accepted })
    client.write('resource_pack_receive', { uuid: uuid, result: ResourcePackResult.SuccessfullyLoaded })
  }

  private acceptResourcePackViaHash(client: Client, hash: string) {
    client.write('resource_pack_receive', { result: ResourcePackResult.Accepted, hash: hash })
    client.write('resource_pack_receive', { result: ResourcePackResult.SuccessfullyLoaded, hash: hash })
  }
}

enum ResourcePackResult {
  SuccessfullyLoaded = 0,
  Declined = 1,
  FailedDownload = 2,
  Accepted = 3
}
