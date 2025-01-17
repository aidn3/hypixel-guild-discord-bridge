import type Application from '../application.js'

export default class Autocomplete {
  private usernames: string[] = []
  private inclusion = new Set<string>()

  constructor(application: Application) {
    application.on('chat', (event) => {
      this.addUsername(event.username)
    })
    application.on('guildPlayer', (event) => {
      this.addUsername(event.username)
    })
    application.on('command', (event) => {
      this.addUsername(event.username)
    })
    application.on('commandFeedback', (event) => {
      this.addUsername(event.username)
    })

    const regexOnline = /(\w{3,16}) \u25CF/g
    application.on('minecraftChat', (event) => {
      if (event.message.length === 0) return

      let match = regexOnline.exec(event.message)
      while (match != undefined) {
        const username = match[1]
        this.addUsername(username)

        match = regexOnline.exec(event.message)
      }
    })
    // MetricsInstance also fetches guild list all the time
    // This will make the minecraftChat event spams a lot
    setInterval(() => {
      application.clusterHelper.sendCommandToAllMinecraft('/guild list')
    }, 60_000)
  }

  /**
   * Return a sorted list from best match to least.
   *
   * The results are sorted alphabetically by:
   * - matching the query with the start of a username
   * - matching any part of a username with the query
   *
   * @param query the usernames to look for
   */
  public username(query: string): string[] {
    const copy = [...this.usernames]
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

  private addUsername(username: string): void {
    const loweredCase = username.toLowerCase()
    if (this.inclusion.has(loweredCase)) return
    this.inclusion.add(loweredCase)
    this.usernames.push(username)
  }
}
