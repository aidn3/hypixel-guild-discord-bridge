import assert from 'node:assert'

import BadWords from 'bad-words'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import type { MojangApi } from '../../util/mojang.js'
import { LinkType } from '../users/features/verification.js'

import { CommandsHeat } from './commands-heat.js'
import PunishmentsEnforcer from './handlers/punishments-enforcer.js'
import Punishments from './punishments.js'

export default class ModerationInstance extends Instance<InstanceType.Moderation> {
  public readonly punishments: Punishments
  public readonly commandsHeat: CommandsHeat
  private readonly enforcer: PunishmentsEnforcer

  public profanityFilter: BadWords.BadWords | undefined
  private readonly config: ConfigManager<ModerationConfig>

  private readonly mojangApi: MojangApi

  constructor(application: Application, mojangApi: MojangApi) {
    super(application, InternalInstancePrefix + InstanceType.Moderation, InstanceType.Moderation)

    this.config = new ConfigManager(application, this.logger, application.getConfigFilePath('moderation.json'), {
      heatPunishment: true,
      mutesPerDay: 10,
      kicksPerDay: 5,

      immuneDiscordUsers: [],
      immuneMojangPlayers: [],

      profanityEnabled: true,
      profanityWhitelist: ['sadist', 'hell', 'damn', 'god', 'shit', 'balls', 'retard'],
      profanityBlacklist: []
    })
    this.mojangApi = mojangApi

    this.reloadProfanity()
    assert(this.profanityFilter !== undefined)

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

  public reloadProfanity(): void {
    this.profanityFilter = new BadWords()
    this.profanityFilter.removeWords(...this.config.data.profanityWhitelist)
    this.profanityFilter.addWords(...this.config.data.profanityBlacklist)
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    if (!this.config.data.profanityEnabled) return { filteredMessage: message, changed: false }
    assert(this.profanityFilter)

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

  public immuneDiscord(discordId: string): boolean {
    return this.config.data.immuneDiscordUsers.includes(discordId)
  }

  public immuneMinecraft(username: string): boolean {
    return this.config.data.immuneMojangPlayers.includes(username)
  }

  async getMinecraftIdentifiers(username: string): Promise<string[]> {
    const identifiers = [username]

    const mojangProfile = await this.mojangApi.profileByUsername(username).catch(() => undefined)
    if (mojangProfile) {
      identifiers.push(mojangProfile.id, mojangProfile.name)

      const link = this.application.usersManager.verification.findByIngame(mojangProfile.id)
      if (link.type === LinkType.Confirmed) identifiers.push(link.link.discordId)
    }

    return identifiers
  }
}

export interface ModerationConfig {
  heatPunishment: boolean
  mutesPerDay: number
  kicksPerDay: number

  immuneDiscordUsers: string[]
  immuneMojangPlayers: string[]

  profanityEnabled: boolean
  profanityWhitelist: string[]
  profanityBlacklist: string[]
}
