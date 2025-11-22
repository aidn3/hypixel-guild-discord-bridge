import assert from 'node:assert'

import Logger4js from 'log4js'

import { InternalInstancePrefix } from '../common/instance.js'

import Duration from './duration'

export function sufficeToTime(suffice: string): number {
  suffice = suffice.toLowerCase().trim()

  if (suffice === 's' || suffice.length === 0) return 1 // default
  if (suffice === 'm') return 60
  if (suffice === 'h') return 60 * 60
  if (suffice === 'd') return 60 * 60 * 24
  if (suffice === 'y') return 60 * 60 * 24 * 30 * 12

  throw new Error(`Unexpected suffice: ${suffice}. Need a new update to handle the new one`)
}

export function getDuration(short: string): Duration {
  const regex = /^(\d*)([ydhms]*)$/g
  const match = regex.exec(short)

  if (match != undefined) {
    const time = match[1] as unknown as number
    const suffice = match[2]
    return Duration.seconds(time * sufficeToTime(suffice))
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

export function formatTime(milliseconds: number, maxPrecision = 2): string {
  assert.ok(maxPrecision >= 1, 'Minimum precision is 1')

  const Year = Duration.years(1).toSeconds()

  let result = ''
  let variablesSet = 0
  let remaining = Math.floor(milliseconds / 1000) // milli to seconds

  const years = Math.floor(remaining / Year)
  if (years > 0) {
    result += `${years}y`
    if (++variablesSet >= maxPrecision) return result
  }
  remaining = remaining % Year

  const days = Math.floor(remaining / 86_400)
  if (days > 0) {
    result += `${days}d`
    if (++variablesSet >= maxPrecision) return result
  }
  remaining = remaining % 86_400

  const hours = Math.floor(remaining / 3600)
  if (hours > 0) {
    result += `${hours}h`
    if (++variablesSet >= maxPrecision) return result
  }
  remaining = remaining % 3600

  const minutes = Math.floor(remaining / 60)
  if (minutes > 0) {
    result += `${minutes}m`
    if (++variablesSet >= maxPrecision) return result
  }
  remaining = remaining % 60

  result += `${remaining}s`
  return result
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

  if (instanceName !== instanceName.toLowerCase()) return instanceName

  instanceName = instanceName
    .replaceAll('-', ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return instanceName
}

/**
 * Return a sorted list from best match to least.
 *
 * The results are sorted alphabetically by:
 * - matching the query with the start of a query
 * - matching any part of a username with the query
 *
 * @param query the usernames to look for
 * @param collection collection to look up the query in
 */
export function search(query: string, collection: string[]): string[] {
  const copy = [...collection]
  copy.sort((a, b) => a.localeCompare(b))

  const queryLowerCased = query.toLowerCase()
  const results: string[] = []

  for (const username of copy) {
    if (!results.includes(username) && username.toLowerCase().startsWith(queryLowerCased)) {
      results.push(username)
    }
  }

  for (const username of copy) {
    if (!results.includes(username) && username.toLowerCase().includes(queryLowerCased)) {
      results.push(username)
    }
  }

  return results
}
