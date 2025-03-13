import fs from 'node:fs'

import type { PluginContext, PluginInterface } from '../common/plugins.js'

import { EventType, InstanceType, PunishmentType, Severity, ChannelType } from 'src/common/application-event.js'
import { antiSpamString } from 'src/util/shared-util.js'

enum HeatType {
  SPAM = 'spam',
  PROFANITY = 'profanity'
}

type HeatScore = number

type HeatsTable = Record<HeatType, HeatScore>
type WarnsTable = Record<HeatType, boolean>
type InfractionsTable = Record<HeatType, number>

type HeatUser = string

interface InfractionCase {
  userName: string
  userUuid: string | undefined
  userDiscordId: number | undefined
  infractions: InfractionsTable
  lastInfraction: number
}

const heats: Record<HeatUser, HeatsTable> = {}
const warns: Record<HeatUser, WarnsTable> = {}
let infractions: InfractionCase[] = []

setInterval(() => {
  reduceHeats()
}, 1000)

function saveConfig(path: string): void {
  const dataRaw = JSON.stringify(infractions, undefined, 4)
  fs.writeFileSync(path, dataRaw, { encoding: 'utf8' })
}

function reduceInfractions() {
  for (const infractionCase of infractions) {
    if (infractionCase.lastInfraction <= Date.now() - 7 * 24 * 60 * 60 * 1000) {
      infractions = infractions.filter((infraction) => infraction.userName !== infractionCase.userName)
    }
  }
}

function reduceHeats() {
  for (const [heatUser, heatsTable] of Object.entries(heats)) {
    // @ts-expect-error prefer-const
    for (let [heatType, heatScore] of Object.entries(heatsTable)) {
      switch (heatType) {
        case HeatType.SPAM: {
          heatScore -= 0.05
          break
        }
        case HeatType.PROFANITY: {
          heatScore -= 0.01
          break
        }
      }
      // @ts-expect-error no-dynamic-delete
      if (heatScore <= 0) delete heatsTable[heatType as unknown as HeatType]
      else heatsTable[heatType as unknown as HeatType] = heatScore
    }

    // @ts-expect-error no-dynamic-delete
    if (Object.keys(heatsTable).length === 0) delete heats[heatUser], delete warns[heatUser]
  }
}

export default {
  onRun(context: PluginContext): void {
    const infractionFilePath = context.application.getConfigFilePath('infractions.json')
    infractions.join(JSON.parse(fs.readFileSync(infractionFilePath, 'utf8')))

    context.application.on('chat', (event) => {
      const messageAuthor = event.username
      const messageAuthorId = event.userId

      reduceInfractions()
      saveConfig(infractionFilePath)

      let infractionCase = infractions.find((infraction) => infraction.userDiscordId == messageAuthorId)

      if (heats[messageAuthor] == undefined) {
        heats[messageAuthor] = { spam: 0, profanity: 0 }
      }
      if (warns[messageAuthor] == undefined) {
        warns[messageAuthor] = { spam: false, profanity: false }
      }

      const heatMultiplier = 1 + (infractionCase?.infractions.spam ?? 0) / 10
      heats[messageAuthor].spam += (0.15 + (2 * event.message.length) / 1000) * heatMultiplier

      if (heats[messageAuthor].spam >= 0.8 && !warns[messageAuthor].spam) {
        warns[messageAuthor].spam = true
        context.application.emit('event', {
          localEvent: true,
          instanceType: InstanceType.MAIN,
          instanceName: InstanceType.MAIN,
          eventType: EventType.AUTOMATED,
          severity: Severity.BAD,
          channelType: ChannelType.PUBLIC,
          username: messageAuthor,
          message: `WARNING: ${messageAuthor} stop spamming! @${antiSpamString()}`,
          removeLater: false
        })
      }

      if (heats[messageAuthor].spam >= 1) {
        if (infractionCase) {
          infractionCase.infractions.spam += 1
          infractionCase.lastInfraction = Date.now()
        } else {
          infractionCase = {
            userName: messageAuthor,
            userUuid: undefined,
            userDiscordId: messageAuthorId ?? undefined,
            infractions: {
              spam: 1,
              profanity: 0
            },
            lastInfraction: Date.now()
          }
        }

        infractions = infractions.filter((infraction) => infraction.userName !== messageAuthor)
        infractions.push(infractionCase)
        saveConfig(infractionFilePath)

        context.application.punishedUsers.punish({
          localEvent: true,
          instanceType: InstanceType.MAIN,
          instanceName: context.pluginName,
          type: PunishmentType.MUTE,
          userName: messageAuthor,
          userUuid: undefined,
          userDiscordId: undefined,
          reason: 'Automod: Spam cap reached',
          till: Date.now() + 300_000
        })
      }
    })
  }
} satisfies PluginInterface

// TODOS

// check infraction file exists - create if not
// profanity tracking
// mute time value map
// add settings config - MAJOR
// - spam base value
// - individal char value
// - spam mute reason
// - profanity base value
// - profanity mute reason
// add docs readme
