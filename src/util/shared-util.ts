import { default as Logger4js } from 'log4js'

import { InternalInstancePrefix } from '../common/instance.js'

export function sufficeToTime(suffice: string): number {
  suffice = suffice.toLowerCase().trim()

  if (suffice === 's' || suffice.length === 0) return 1 // default
  if (suffice === 'm') return 60
  if (suffice === 'h') return 60 * 60
  if (suffice === 'd') return 60 * 60 * 24

  throw new Error(`Unexpected suffice: ${suffice}. Need a new update to handle the new one`)
}

export function getDuration(short: string): number {
  const regex = /(\d*)([dhms]*)/g
  const match = regex.exec(short)

  if (match != undefined) {
    const time = match[1] as unknown as number
    const suffice = match[2]
    return time * sufficeToTime(suffice)
  }

  throw new Error('Invalid short time')
}

export function antiSpamString(): string {
  let randomString = ''
  const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 6

  for (let index = 0; index < length; index++) {
    const randomIndex = Math.floor(Math.random() * charSet.length)
    randomString += charSet.charAt(randomIndex)
  }

  return randomString
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function gracefullyExitProcess(exitCode: number): Promise<void> {
  const timeout = sleep(30_000).then(() => {
    // fallback to normal console if it fails to flush logs
    // eslint-disable-next-line no-restricted-syntax
    console.warn('Logger flush timed out. Exiting...')
    process.exit(exitCode)
  })

  Logger4js.shutdown(() => {
    process.exit(exitCode)
  })

  await timeout
}

/**
 * Convert duration number to a duration with prefix
 * @param duration time in milliseconds
 * @return a duration with prefix capped at 1 month. Result always 60 or bigger.
 */
export function durationToMinecraftDuration(duration: number): string {
  // 30 day in seconds
  // Max allowed duration in minecraft. It is a hard limit from server side
  const MaxDuration = 2_592_000
  // 1 minute in seconds. hard limit too
  const MinDuration = 60
  const Prefix = 's' // for "seconds"

  const maxTime = Math.min(MaxDuration, Math.floor(duration / 1000))
  return `${Math.max(maxTime, MinDuration)}${Prefix}`
}

/**
 * Used to convert instanceName to a human-readable one.
 * Most instanceNames are either lowercased or contain metadata such as prefixes.
 * This function aimed to beautify the instanceName and prepare for human display.
 */
export function beautifyInstanceName(instanceName: string): string {
  instanceName = instanceName.startsWith(InternalInstancePrefix)
    ? instanceName.slice(InternalInstancePrefix.length)
    : instanceName

  instanceName = instanceName.slice(0, 1).toUpperCase() + instanceName.slice(1).toLowerCase()
  return instanceName
}
