import { default as StringComparison } from 'string-comparison'

import type { ConfigManager } from '../../../common/config-manager.js'

import type { SanitizerConfig } from './sanitizer.js'

export default class Antispam {
  static readonly MaxHistory = 3
  static readonly SafeScore = 0.8
  static readonly MaxAdditions = 15

  private readonly history = new Map<string, string[]>()

  constructor(private readonly config: ConfigManager<SanitizerConfig>) {}

  public process(instanceName: string, message: string): string {
    let history = this.history.get(instanceName)
    if (history === undefined) {
      history = []
      this.history.set(instanceName, history)
    }

    if (!this.config.data.antispamEnabled) {
      history.push(message)
      if (history.length > Antispam.MaxHistory) {
        history.splice(0, history.length - Antispam.MaxHistory)
      }

      return message
    }

    let newMessage = message

    let addedRandom = 0
    while (
      this.similarity(newMessage, history) > Antispam.SafeScore &&
      addedRandom < this.config.data.antispamMaxAdditions
    ) {
      if (addedRandom === 0) newMessage = newMessage.trim() + ' @'
      newMessage += this.randomLetter()
      addedRandom++
    }

    history.push(newMessage)

    if (history.length > Antispam.MaxHistory) {
      history.splice(0, history.length - Antispam.MaxHistory)
    }

    return newMessage
  }

  private similarity(message: string, history: string[]): number {
    let maxSimilarity = 0
    for (const historyEntry of history) {
      const similarity = StringComparison.levenshtein.similarity(message, historyEntry)
      if (similarity > maxSimilarity) maxSimilarity = similarity
    }
    return maxSimilarity
  }

  private randomLetter(): string {
    const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    const randomIndex = Math.floor(Math.random() * charSet.length)
    return charSet.charAt(randomIndex)
  }
}
