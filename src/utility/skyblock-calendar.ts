import { SkyblockInstant } from './skyblock-instant'

interface EventStart {
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
}

export const SkyblockEventKeys = [
  'BANK_INTEREST',
  'ELECTION_BOOTH_OPENS',
  'ELECTION_OVER',
  'FALLEN_STAR_CULT',
  'FEAR_MONGERER',
  'JERRYS_WORKSHOP',
  'SEASON_OF_JERRY',
  'HOPPITY_HUNT'
] as const

export type SkyblockEventKey = (typeof SkyblockEventKeys)[number]

export interface SkyblockEventNext {
  key: SkyblockEventKey
  name: string
  startTimestamp: number
}

interface SkyblockEventDefinition {
  key: SkyblockEventKey
  name: string
  starts: EventStart[]
}

const BankInterestMonths = [1, 4, 7, 10]
const FallenStarDays = [7, 14, 21, 28]

const SkyblockEventDefinitions: SkyblockEventDefinition[] = [
  {
    key: 'BANK_INTEREST',
    name: 'Bank Interest',
    starts: BankInterestMonths.map((month) => ({ month, day: 1 }))
  },
  {
    key: 'ELECTION_BOOTH_OPENS',
    name: 'Election Booth Opens',
    starts: [{ month: 6, day: 27 }]
  },
  {
    key: 'ELECTION_OVER',
    name: 'Election Over',
    starts: [{ month: 3, day: 27 }]
  },
  {
    key: 'FALLEN_STAR_CULT',
    name: 'Cult of the Fallen Star',
    starts: buildFallenStarStarts()
  },
  {
    key: 'FEAR_MONGERER',
    name: 'Fear Mongerer',
    starts: [{ month: 8, day: 26 }]
  },
  {
    key: 'JERRYS_WORKSHOP',
    name: "Jerry's Workshop",
    starts: [{ month: 12, day: 1 }]
  },
  {
    key: 'SEASON_OF_JERRY',
    name: 'Season of Jerry',
    starts: [{ month: 12, day: 24 }]
  },
  {
    key: 'HOPPITY_HUNT',
    name: "Hoppity's Hunt",
    starts: [{ month: 1, day: 1 }]
  }
]

export function getNextSkyblockEvents(now: number): SkyblockEventNext[] {
  const current = SkyblockInstant.toSkyblockInstant(now)
  const years = [current.year, current.year + 1]

  const nextEvents: SkyblockEventNext[] = []

  for (const event of SkyblockEventDefinitions) {
    let next: SkyblockEventNext | undefined

    for (const year of years) {
      for (const start of event.starts) {
        const startTimestamp = toTimestamp(year, start)
        if (startTimestamp < now) continue
        if (!next || startTimestamp < next.startTimestamp) {
          next = {
            key: event.key,
            name: event.name,
            startTimestamp: startTimestamp
          }
        }
      }
    }

    if (next) nextEvents.push(next)
  }

  return nextEvents
}

export function isSkyblockEventKey(value: string): value is SkyblockEventKey {
  return SkyblockEventKeys.includes(value as SkyblockEventKey)
}

function toTimestamp(year: number, start: EventStart): number {
  return SkyblockInstant.toTimestamp({
    year,
    month: start.month,
    day: start.day,
    hour: start.hour ?? 0,
    minute: start.minute ?? 0,
    second: start.second ?? 0
  })
}

function buildFallenStarStarts(): EventStart[] {
  const starts: EventStart[] = []
  for (let month = 1; month <= 12; month += 1) {
    for (const day of FallenStarDays) {
      starts.push({ month, day })
    }
  }
  return starts
}
