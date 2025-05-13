import BadWords from 'bad-words'

import type Application from '../../application.js'
import { InstanceType, type UserIdentifier } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import type { MojangApi } from '../../util/mojang.js'

import { CommandsHeat } from './commands-heat.js'
import PunishmentsEnforcer from './handlers/punishments-enforcer.js'
import Punishments from './punishments.js'
import { matchUserIdentifier } from './util.js'

export default class ModerationInstance extends Instance<InstanceType.Moderation> {
  public readonly punishments: Punishments
  public readonly commandsHeat: CommandsHeat
  private readonly enforcer: PunishmentsEnforcer

  public readonly profanityFilter: BadWords.BadWords | undefined
  private readonly config: ConfigManager<ModerationConfig>

  private readonly mojangApi: MojangApi

  constructor(application: Application, mojangApi: MojangApi) {
    super(application, InternalInstancePrefix + InstanceType.Moderation, InstanceType.Moderation)

    this.config = new ConfigManager(application, application.getConfigFilePath('moderation.json'), {
      heatPunishment: true,
      mutesPerDay: 10,
      kicksPerDay: 5,
      immune: [],
      profanityEnabled: true,
      profanityWhitelist: ['sadist', 'hell', 'damn', 'god', 'shit', 'balls', 'retard'],
      profanityBlacklist: []
    })
    this.mojangApi = mojangApi

    if (this.config.data.profanityEnabled) {
      this.profanityFilter = new BadWords()
      this.profanityFilter.removeWords(...this.config.data.profanityWhitelist)
      this.profanityFilter.addWords(...this.config.data.profanityBlacklist)
    } else {
      this.profanityFilter = undefined
    }

    this.punishments = new Punishments(application)
    this.commandsHeat = new CommandsHeat(
      application,
      this,
      this.config,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )
    this.enforcer = new PunishmentsEnforcer(application, this, this.eventHelper, this.logger, this.errorHandler)
  }

  public getConfig(): ConfigManager<ModerationConfig> {
    return this.config
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
    return matchUserIdentifier(identifiers, this.config.data.immune)
  }

  async getMinecraftIdentifiers(username: string): Promise<string[]> {
    const mojangProfile = await this.mojangApi.profileByUsername(username).catch(() => undefined)
    const identifiers = [username]
    if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)
    return identifiers
  }
}

export interface ModerationConfig {
  heatPunishment: boolean
  mutesPerDay: number
  kicksPerDay: number
  immune: string[]
  profanityEnabled: boolean
  profanityWhitelist: string[]
  profanityBlacklist: string[]
}
