import BadWords from 'bad-words'

import type { ModerationConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType, type UserIdentifier } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import type { MojangApi } from '../../util/mojang.js'

import { CommandsHeat } from './commands-heat.js'
import PunishmentsEnforcer from './handlers/punishments-enforcer.js'
import Punishments from './punishments.js'
import { matchUserIdentifier } from './util.js'

export default class ModerationInstance extends Instance<ModerationConfig, InstanceType.Moderation> {
  public readonly punishments: Punishments
  public readonly commandsHeat: CommandsHeat
  private readonly enforcer: PunishmentsEnforcer

  public readonly profanityFilter: BadWords.BadWords | undefined

  private readonly mojangApi: MojangApi

  constructor(application: Application, mojangApi: MojangApi, config: ModerationConfig) {
    super(application, InternalInstancePrefix + InstanceType.Moderation, InstanceType.Moderation, true, config)

    this.mojangApi = mojangApi

    if (config.profanity.enabled) {
      this.profanityFilter = new BadWords({
        emptyList: !this.config.profanity.enabled
      })
      this.logger.info(this.config.profanity.blacklist)
      this.profanityFilter.removeWords(...this.config.profanity.whitelist)
      this.profanityFilter.addWords(...this.config.profanity.blacklist)
    } else {
      this.profanityFilter = undefined
    }

    this.punishments = new Punishments(application)
    this.commandsHeat = new CommandsHeat(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.config
    )
    this.enforcer = new PunishmentsEnforcer(application, this, this.eventHelper, this.logger, this.errorHandler)
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    if (this.profanityFilter === undefined) return { filteredMessage: message, changed: false }

    let filtered: string
    try {
      filtered = this.profanityFilter.clean(message)
    } catch {
      /*
          profanity package has bug.
          will throw error if given one special character.
          example: clean("?")
          message is clear if thrown
        */
      filtered = message
    }

    return { filteredMessage: filtered, changed: message !== filtered }
  }

  public immune(identifiers: UserIdentifier): boolean {
    return matchUserIdentifier(identifiers, this.config.immune)
  }

  async getMinecraftIdentifiers(username: string): Promise<string[]> {
    const mojangProfile = await this.mojangApi.profileByUsername(username).catch(() => undefined)
    const identifiers = [username]
    if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)
    return identifiers
  }
}
