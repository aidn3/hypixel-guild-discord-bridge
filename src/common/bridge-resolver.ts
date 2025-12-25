import type { BridgeConfig } from '../application-config.js'
import type { BridgeConfigurations } from '../core/discord/bridge-configurations.js'
import type { ChannelType } from './application-event.js'

/**
 * Represents a resolved bridge with its configuration.
 * Can come from either static config or dynamic database config.
 */
export interface ResolvedBridge {
  id: string
  minecraftInstanceNames: string[]
  publicChannelIds: string[]
  officerChannelIds: string[]
}

/**
 * Resolves bridge membership for instances and channels.
 * Supports multi-guild configurations where specific Minecraft instances
 * are linked to specific Discord channels.
 * 
 * Configuration sources (in order of priority):
 * 1. Static config from config.yaml (bridges array)
 * 2. Dynamic config from database (via /settings command)
 */
export class BridgeResolver {
  /**
   * Default bridge ID used when no bridges are configured (legacy mode)
   */
  public static readonly DEFAULT_BRIDGE_ID = 'default'

  private readonly staticBridges: readonly BridgeConfig[]
  private dynamicConfig: BridgeConfigurations | undefined

  // Lookup maps for fast resolution (rebuilt when config changes)
  private instanceToBridge: Map<string, string> = new Map()
  private publicChannelToBridge: Map<string, string> = new Map()
  private officerChannelToBridge: Map<string, string> = new Map()

  constructor(staticBridges: BridgeConfig[] | undefined) {
    this.staticBridges = staticBridges ?? []
    this.rebuildLookupMaps()
  }

  /**
   * Set the dynamic configuration source (called after Core is initialized)
   */
  public setDynamicConfig(config: BridgeConfigurations): void {
    this.dynamicConfig = config
    this.rebuildLookupMaps()
  }

  /**
   * Rebuild lookup maps from both static and dynamic configuration
   */
  public rebuildLookupMaps(): void {
    this.instanceToBridge.clear()
    this.publicChannelToBridge.clear()
    this.officerChannelToBridge.clear()

    // First, add static bridges
    for (const bridge of this.staticBridges) {
      for (const instanceName of bridge.minecraftInstanceNames) {
        this.instanceToBridge.set(instanceName.toLowerCase(), bridge.id)
      }
      for (const channelId of bridge.discord.publicChannelIds) {
        this.publicChannelToBridge.set(channelId, bridge.id)
      }
      for (const channelId of bridge.discord.officerChannelIds) {
        this.officerChannelToBridge.set(channelId, bridge.id)
      }
    }

    // Then, add dynamic bridges (can override static if same ID)
    if (this.dynamicConfig !== undefined) {
      for (const bridgeId of this.dynamicConfig.getAllBridgeIds()) {
        for (const instanceName of this.dynamicConfig.getMinecraftInstances(bridgeId)) {
          this.instanceToBridge.set(instanceName.toLowerCase(), bridgeId)
        }
        for (const channelId of this.dynamicConfig.getPublicChannelIds(bridgeId)) {
          this.publicChannelToBridge.set(channelId, bridgeId)
        }
        for (const channelId of this.dynamicConfig.getOfficerChannelIds(bridgeId)) {
          this.officerChannelToBridge.set(channelId, bridgeId)
        }
      }
    }
  }

  /**
   * Check if multi-bridge mode is enabled (bridges are configured)
   */
  public isMultiBridgeEnabled(): boolean {
    const hasDynamicBridges = this.dynamicConfig !== undefined && this.dynamicConfig.getAllBridgeIds().length > 0
    return this.staticBridges.length > 0 || hasDynamicBridges
  }

  /**
   * Get all configured bridges (merged from static and dynamic)
   */
  public getAllBridges(): ResolvedBridge[] {
    const bridgesMap = new Map<string, ResolvedBridge>()

    // Add static bridges first
    for (const bridge of this.staticBridges) {
      bridgesMap.set(bridge.id, {
        id: bridge.id,
        minecraftInstanceNames: [...bridge.minecraftInstanceNames],
        publicChannelIds: [...bridge.discord.publicChannelIds],
        officerChannelIds: [...bridge.discord.officerChannelIds]
      })
    }

    // Add/merge dynamic bridges
    if (this.dynamicConfig !== undefined) {
      for (const bridgeId of this.dynamicConfig.getAllBridgeIds()) {
        bridgesMap.set(bridgeId, {
          id: bridgeId,
          minecraftInstanceNames: this.dynamicConfig.getMinecraftInstances(bridgeId),
          publicChannelIds: this.dynamicConfig.getPublicChannelIds(bridgeId),
          officerChannelIds: this.dynamicConfig.getOfficerChannelIds(bridgeId)
        })
      }
    }

    return [...bridgesMap.values()]
  }

  /**
   * Resolve the bridge ID for a Minecraft instance name.
   * Returns undefined if the instance is not part of any bridge.
   */
  public getBridgeIdForInstance(instanceName: string): string | undefined {
    if (!this.isMultiBridgeEnabled()) return undefined
    return this.instanceToBridge.get(instanceName.toLowerCase())
  }

  /**
   * Resolve the bridge ID for a Discord channel.
   * Returns the bridge ID if the channel belongs to a bridge, undefined otherwise.
   */
  public getBridgeIdForChannel(channelId: string): string | undefined {
    if (!this.isMultiBridgeEnabled()) return undefined
    return this.publicChannelToBridge.get(channelId) ?? this.officerChannelToBridge.get(channelId)
  }

  /**
   * Get the channel type (public/officer) for a channel within its bridge.
   * Returns undefined if the channel is not part of any bridge.
   */
  public getChannelTypeForChannel(channelId: string): 'public' | 'officer' | undefined {
    if (this.publicChannelToBridge.has(channelId)) return 'public'
    if (this.officerChannelToBridge.has(channelId)) return 'officer'
    return undefined
  }

  /**
   * Get a bridge configuration by its ID.
   */
  public getBridgeById(bridgeId: string): ResolvedBridge | undefined {
    return this.getAllBridges().find((b) => b.id === bridgeId)
  }

  /**
   * Get all public channel IDs for a specific bridge.
   * If bridgeId is undefined and multi-bridge is disabled, returns empty array
   * (caller should use legacy configuration).
   */
  public getPublicChannelIds(bridgeId: string | undefined): string[] {
    if (!this.isMultiBridgeEnabled()) return []
    if (bridgeId === undefined) return []

    const bridge = this.getBridgeById(bridgeId)
    return bridge?.publicChannelIds ?? []
  }

  /**
   * Get all officer channel IDs for a specific bridge.
   * If bridgeId is undefined and multi-bridge is disabled, returns empty array
   * (caller should use legacy configuration).
   */
  public getOfficerChannelIds(bridgeId: string | undefined): string[] {
    if (!this.isMultiBridgeEnabled()) return []
    if (bridgeId === undefined) return []

    const bridge = this.getBridgeById(bridgeId)
    return bridge?.officerChannelIds ?? []
  }

  /**
   * Check if two bridge IDs match (both undefined counts as a match for legacy mode).
   */
  public bridgesMatch(bridgeId1: string | undefined, bridgeId2: string | undefined): boolean {
    // If multi-bridge is not enabled, everything matches
    if (!this.isMultiBridgeEnabled()) return true

    // If both are undefined, they match (legacy mode)
    if (bridgeId1 === undefined && bridgeId2 === undefined) return true

    // Otherwise, they must be equal
    return bridgeId1 === bridgeId2
  }

  /**
   * Check if an event with the given bridgeId should be processed by an instance with the given instanceName.
   */
  public shouldProcessEvent(eventBridgeId: string | undefined, instanceName: string): boolean {
    if (!this.isMultiBridgeEnabled()) return true

    const instanceBridgeId = this.getBridgeIdForInstance(instanceName)

    // If the instance is not part of any bridge, it processes all events (legacy behavior)
    if (instanceBridgeId === undefined) return true

    // If the event has no bridge ID, it's a global event - process it
    if (eventBridgeId === undefined) return true

    // Otherwise, only process if bridges match
    return instanceBridgeId === eventBridgeId
  }
}
