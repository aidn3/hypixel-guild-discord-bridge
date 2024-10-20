import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, InternalInstancePrefix, Status } from '../../common/client-instance.js'
import type { MojangApi } from '../../util/mojang.js'

import EnforcePunishments from './handlers/enforce-punishments.js'
import Punishments from './punishments.js'

export default class PunishmentsInstance extends ClientInstance<unknown> {
  public readonly punishments: Punishments
  private readonly enforcer: EnforcePunishments

  private readonly mojangApi: MojangApi

  constructor(application: Application, mojangApi: MojangApi) {
    super(application, InternalInstancePrefix + 'punishments', InstanceType.Punishments, undefined)

    this.mojangApi = mojangApi
    this.punishments = new Punishments(application)
    this.enforcer = new EnforcePunishments(application, this)
  }

  async getMinecraftIdentifiers(username: string): Promise<string[]> {
    const mojangProfile = await this.mojangApi.profileByUsername(username).catch(() => undefined)
    const identifiers = [username]
    if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)
    return identifiers
  }

  connect(): void {
    this.setAndBroadcastNewStatus(Status.Connected, 'punishments system is ready')
  }
}
