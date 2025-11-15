import assert from 'node:assert'

import BadWords from 'bad-words'

import type { ModerationConfigurations } from './moderation-configurations'

export class Profanity {
  public profanityFilter: BadWords.BadWords

  constructor(private readonly config: ModerationConfigurations) {
    this.profanityFilter = this.createFilter()
  }

  private createFilter(): BadWords.BadWords {
    const profanityFilter = new BadWords()
    profanityFilter.removeWords(...this.config.getProfanityWhitelist())
    profanityFilter.addWords(...this.config.getProfanityBlacklist())

    return profanityFilter
  }

  public reloadProfanity(): void {
    this.profanityFilter = this.createFilter()
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    if (!this.config.getProfanityEnabled())
      return {
        filteredMessage: message,
        changed: false
      }
    assert.ok(this.profanityFilter)

    let filtered: string
    try {
      filtered = this.profanityFilter.clean(message)
    } catch {
      /*
          profanity package has bug.
          will throw error if given one special character.
          example: clean("?")
          message is clear if thrown
        */
      filtered = message
    }

    return { filteredMessage: filtered, changed: message !== filtered }
  }
}
