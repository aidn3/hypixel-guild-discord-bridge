import { PunishmentEvent, PunishmentType } from '../common/ApplicationEvent'
import Application from '../Application'

export class PunishedUsers {
  private punishments = new Map<PunishmentType, PunishmentEvent[]>()

  constructor(app: Application) {
    app.on('punish', (event) => {
      let allPunishments = this.punishments.get(event.type)
      if (allPunishments === undefined) {
        allPunishments = []
        this.punishments.set(event.type, allPunishments)
      }

      this.handlePunishment(allPunishments, event)
    })
  }

  punished(name: string, type: PunishmentType): number | undefined {
    let allPunishments = this.punishments.get(type)
    if (allPunishments === undefined) {
      allPunishments = []
      this.punishments.set(type, allPunishments)
    }

    const current = Date.now()
    const punishment = allPunishments.find((p) => p.name.toLowerCase() === name.toLowerCase())

    if (punishment && punishment.till > current) {
      return punishment.till
    }
    return undefined
  }

  allPunishments(): PunishmentEvent[] {
    const current = Date.now()
    const result: PunishmentEvent[] = []

    for (const [, events] of this.punishments) {
      result.push(...events.filter((event) => event.till > current))
    }

    return result
  }

  private handlePunishment(allPunishments: PunishmentEvent[], newPunishment: PunishmentEvent): PunishmentEvent[] {
    const current = Date.now()

    allPunishments = allPunishments.filter(
      (punishment) => punishment.name.toLowerCase() !== newPunishment.name.toLowerCase() && punishment.till < current
    )

    if (!newPunishment.forgive) {
      allPunishments.push(newPunishment)
    }

    return allPunishments
  }
}
