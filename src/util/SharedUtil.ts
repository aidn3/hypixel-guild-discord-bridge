export function sufficeToTime(suffice: string): number {
  suffice = suffice.toLowerCase().trim()

  if (suffice === 's' || suffice.length === 0) return 1 // default
  if (suffice === 'm') return 60
  if (suffice === 'h') return 60 * 60
  if (suffice === 'd') return 60 * 60 * 24

  throw new Error(`Unexpected suffice: ${suffice}. Need a new update to handle the new one`)
}

export function getDuration(short: string): number {
  const regex = /(\d*)([smhd]*)/g
  const match = regex.exec(short)

  if (match != null) {
    const time = match[1] as unknown as number
    const suffice = match[2]
    return time * sufficeToTime(suffice)
  }

  throw new Error('Invalid short time')
}
