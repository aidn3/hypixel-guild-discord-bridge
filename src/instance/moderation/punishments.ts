import fs from 'node:fs'

import type Application from '../../application.js'
import type { PunishmentAddEvent, PunishmentForgiveEvent } from '../../common/application-event.js'
import { PunishmentType } from '../../common/application-event.js'

import { matchUserIdentifier } from './utility'

type PunishmentsRecord = Record<PunishmentType, PunishmentAddEvent[]>

export default class Punishments {
  private static readonly ConfigName = 'punishments.json'

  private readonly app: Application
  private readonly configFilePath: string
  private records: PunishmentsRecord = {
    [PunishmentType.Mute]: [],
    [PunishmentType.Ban]: []
  }

  constructor(app: Application) {
    this.app = app
    this.configFilePath = app.getConfigFilePath(Punishments.ConfigName)
    this.app.applicationIntegrity.addConfigPath(this.configFilePath)
    this.loadFromConfig()
  }

  public add(event: PunishmentAddEvent): void {
    this.app.emit('punishmentAdd', event)

    const originalList = this.records[event.type]
    const currentTime = Date.now()
    const identifiers = [event.userName, event.userUuid, event.userDiscordId].filter((id) => id !== undefined)

    const modifiedList = originalList.filter(
      (punishment) => punishment.till < currentTime || !matchUserIdentifier(punishment, identifiers)
    )

    modifiedList.push(event)
    this.records[event.type] = modifiedList
    this.saveConfig()
  }

  public remove(event: PunishmentForgiveEvent): PunishmentAddEvent[] {
    this.app.emit('punishmentForgive', event)

    const result: PunishmentAddEvent[] = []

    const currentTime = Date.now()
    for (const type of Object.keys(this.records) as PunishmentType[]) {
      this.records[type] = this.records[type].filter((punishment) => {
        if (punishment.till < currentTime) return false
        const shouldDelete = matchUserIdentifier(punishment, event.userIdentifiers)
        if (shouldDelete) {
          result.push(punishment)
          return false
        }
        return true
      })
    }

    this.saveConfig()
    return result
  }

  punishedTill(identifiers: string[], type: PunishmentType): number | undefined {
    const allPunishments = this.records[type]

    const current = Date.now()
    const punishment = allPunishments.find((p) => p.till > current && matchUserIdentifier(p, identifiers))

    if (punishment) {
      return punishment.till
    }
    return undefined
  }

  findByUser(identifiers: string[]): PunishmentAddEvent[] {
    const current = Date.now()
    const result: PunishmentAddEvent[] = []

    for (const [, events] of Object.entries(this.records)) {
      result.push(...events.filter((event) => event.till > current && matchUserIdentifier(event, identifiers)))
    }

    return result
  }

  all(): PunishmentAddEvent[] {
    const current = Date.now()
    const result: PunishmentAddEvent[] = []

    for (const [, events] of Object.entries(this.records)) {
      result.push(...events.filter((event) => event.till > current))
    }

    return result
  }

  private loadFromConfig(): void {
    if (!fs.existsSync(this.configFilePath)) return

    const fileData = fs.readFileSync(this.configFilePath, 'utf8')
    this.records = JSON.parse(fileData) as PunishmentsRecord
  }

  private saveConfig(): void {
    const dataRaw = JSON.stringify(this.records, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }
}
