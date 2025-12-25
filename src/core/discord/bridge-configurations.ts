import type { SqliteManager } from '../../common/sqlite-manager'
import type { Configuration, ConfigurationsManager } from '../configurations'

/**
 * Configuration for bridge channel mappings stored in the database.
 * This allows dynamic configuration via /settings command.
 */
export class BridgeConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('bridges')
  }

  /**
   * Get all bridge IDs that have been configured dynamically
   */
  public getAllBridgeIds(): string[] {
    return this.configuration.getStringArray('bridgeIds', [])
  }

  /**
   * Add a new bridge ID to the list of bridges
   */
  public addBridgeId(bridgeId: string): void {
    const existing = this.getAllBridgeIds()
    if (!existing.includes(bridgeId)) {
      existing.push(bridgeId)
      this.configuration.setStringArray('bridgeIds', existing)
    }
  }

  /**
   * Remove a bridge ID from the list of bridges
   */
  public removeBridgeId(bridgeId: string): void {
    const existing = this.getAllBridgeIds()
    const filtered = existing.filter((id) => id !== bridgeId)
    this.configuration.setStringArray('bridgeIds', filtered)

    // Also clean up the bridge's channel/instance configurations
    this.configuration.delete(`${bridgeId}_publicChannelIds`)
    this.configuration.delete(`${bridgeId}_officerChannelIds`)
    this.configuration.delete(`${bridgeId}_minecraftInstances`)
  }

  /**
   * Get public channel IDs for a specific bridge
   */
  public getPublicChannelIds(bridgeId: string): string[] {
    return this.configuration.getStringArray(`${bridgeId}_publicChannelIds`, [])
  }

  /**
   * Set public channel IDs for a specific bridge
   */
  public setPublicChannelIds(bridgeId: string, channelIds: string[]): void {
    this.configuration.setStringArray(`${bridgeId}_publicChannelIds`, channelIds)
  }

  /**
   * Get officer channel IDs for a specific bridge
   */
  public getOfficerChannelIds(bridgeId: string): string[] {
    return this.configuration.getStringArray(`${bridgeId}_officerChannelIds`, [])
  }

  /**
   * Set officer channel IDs for a specific bridge
   */
  public setOfficerChannelIds(bridgeId: string, channelIds: string[]): void {
    this.configuration.setStringArray(`${bridgeId}_officerChannelIds`, channelIds)
  }

  /**
   * Get Minecraft instance names for a specific bridge
   */
  public getMinecraftInstances(bridgeId: string): string[] {
    return this.configuration.getStringArray(`${bridgeId}_minecraftInstances`, [])
  }

  /**
   * Set Minecraft instance names for a specific bridge
   */
  public setMinecraftInstances(bridgeId: string, instanceNames: string[]): void {
    this.configuration.setStringArray(`${bridgeId}_minecraftInstances`, instanceNames)
  }
}
