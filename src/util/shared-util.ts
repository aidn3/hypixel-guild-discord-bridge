import { shutdown as flushLogger } from 'log4js'

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

export function shutdownApplication(exitCode: number): void {
  void sleep(30_000).then(() => {
    console.warn('Logger flush timed out. Exiting...')
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(exitCode)
  })

  flushLogger(() => {
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(exitCode)
  })
}

export const escapeDiscord = function (message: string): string {
  message = message.split('\\').join('\\\\') // "\"
  message = message.split('_').join('\\_') // Italic
  message = message.split('*').join('\\*') // bold
  message = message.split('~').join('\\~') // strikethrough
  message = message.split('`').join('\\`') // code
  message = message.split('@').join('\\@-') // mentions

  return message
}
