import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, InternalInstancePrefix, Status } from '../../common/client-instance.js'
import type { MojangApi } from '../../util/mojang.js'

import PunishmentsEnforcer from './handlers/punishments-enforcer.js'
import Punishments from './punishments.js'

export default class ModerationInstance extends ClientInstance<unknown> {
  public readonly punishments: Punishments
  private readonly enforcer: PunishmentsEnforcer

  private readonly mojangApi: MojangApi

  constructor(application: Application, mojangApi: MojangApi) {
    super(application, InternalInstancePrefix + InstanceType.Moderation, InstanceType.Moderation, undefined)

    this.mojangApi = mojangApi
    this.punishments = new Punishments(application)
    this.enforcer = new PunishmentsEnforcer(application, this, this.logger, this.errorHandler)
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
