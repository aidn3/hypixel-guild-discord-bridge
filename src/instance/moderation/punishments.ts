import fs from 'node:fs'

import * as TypescriptChecker from 'ts-interface-checker'
import { createCheckers } from 'ts-interface-checker'

import type Application from '../../application.js'
import type { PunishmentAddEvent, PunishmentForgiveEvent } from '../../common/application-event.js'
import { PunishmentType } from '../../common/application-event.js'

import ApplicationEventTi from './application-event-ti.js'
import { matchUserIdentifier } from './util.js'

const ApplicationEventChecker = createCheckers({
  ...ApplicationEventTi,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PunishmentList: TypescriptChecker.array('PunishmentAddEvent')
})

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

    app.on('punishmentAdd', (event) => {
      if (event.localEvent) return
      this.add(event)
    })
    app.on('punishmentForgive', (event) => {
      if (event.localEvent) return
      this.remove(event)
    })
  }

  public add(event: PunishmentAddEvent): void {
    if (event.localEvent) this.app.emit('punishmentAdd', event)

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
    if (event.localEvent) this.app.emit('punishmentForgive', event)

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
    const punishmentsRecord = JSON.parse(fileData) as PunishmentsRecord

    for (const [type, punishments] of Object.entries(punishmentsRecord)) {
      ApplicationEventChecker.PunishmentType.check(type)
      ApplicationEventChecker.PunishmentList.check(punishments)
    }

    this.records = punishmentsRecord
  }

  private saveConfig(): void {
    const dataRaw = JSON.stringify(this.records, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }
}
