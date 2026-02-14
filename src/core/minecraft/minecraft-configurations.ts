import type { Configuration, ConfigurationsManager } from '../configurations'

export class MinecraftConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('minecraft')
  }

  public getHelperRoles(): string[] {
    return this.configuration.getStringArray('helperRoles', ['staff', 'manager', 'helper'])
  }
  public setHelperRoles(roles: string[]): void {
    this.configuration.setStringArray('helperRoles', roles)
  }

  public getGuildMasterOfficer(): boolean {
    return this.configuration.getBoolean('guildMasterOfficer', true)
  }

  public setGuildMasterOfficer(enabled: boolean): void {
    this.configuration.setBoolean('guildMasterOfficer', enabled)
  }

  public getAdminUsername(): string {
    return this.configuration.getString('adminUsername', 'Steve')
  }

  public setAdminUsername(username: string): void {
    this.configuration.setString('adminUsername', username)
  }

  public getAnnounceMutedPlayer(): boolean {
    return this.configuration.getBoolean('announceMutedPlayer', true)
  }

  public setAnnounceMutedPlayer(value: boolean): void {
    this.configuration.setBoolean('announceMutedPlayer', value)
  }

  public getJoinGuildReaction(): boolean {
    return this.configuration.getBoolean('joinGuildReaction', true)
  }

  public setJoinGuildReaction(value: boolean): void {
    this.configuration.setBoolean('joinGuildReaction', value)
  }

  public getKickGuildReaction(): boolean {
    return this.configuration.getBoolean('kickGuildReaction', true)
  }

  public setKickGuildReaction(value: boolean): void {
    this.configuration.setBoolean('kickGuildReaction', value)
  }

  public getLeaveGuildReaction(): boolean {
    return this.configuration.getBoolean('leaveGuildReaction', true)
  }

  public setLeaveGuildReaction(value: boolean): void {
    this.configuration.setBoolean('leaveGuildReaction', value)
  }

  public getAntispamEnabled(): boolean {
    return this.configuration.getBoolean('antispamEnabled', true)
  }

  public setAntispamEnabled(value: boolean): void {
    this.configuration.setBoolean('antispamEnabled', value)
  }

  public getHideLinksViaStuf(): boolean {
    return this.configuration.getBoolean('hideLinksViaStuf', false)
  }

  public setHideLinksViaStuf(value: boolean): void {
    this.configuration.setBoolean('hideLinksViaStuf', value)
  }

  public getResolveHideLinks(): boolean {
    return this.configuration.getBoolean('resolveHideLinks', true)
  }

  public setResolveHideLinks(value: boolean): void {
    this.configuration.setBoolean('resolveHideLinks', value)
  }
}
