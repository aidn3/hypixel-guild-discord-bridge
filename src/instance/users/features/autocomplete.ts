import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { InstanceType } from '../../../common/application-event.js'
import { Status } from '../../../common/connectable-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type UsersManager from '../users-manager.js'

export default class Autocomplete extends EventHandler<UsersManager, InstanceType.Util, void> {
  private readonly usernames: string[] = []
  private readonly loweredCaseUsernames = new Set<string>()

  private readonly guildRanks: string[] = []

  constructor(
    application: Application,
    clientInstance: UsersManager,
    eventHelper: EventHelper<InstanceType.Util>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

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

    setInterval(() => {
      void this.fetchGuildInfo().catch(this.errorHandler.promiseCatch('fetching guild info for autocomplete'))
    }, 60_000)

    const ranksResolver = setTimeout(() => {
      void this.resolveGuildRanks().catch(this.errorHandler.promiseCatch('resolving guild ranks'))
    }, 10 * 1000)
    application.on('minecraftSelfBroadcast', (): void => {
      ranksResolver.refresh()
    })
    application.on('instanceAnnouncement', (event): void => {
      if (event.instanceType === InstanceType.Minecraft) {
        ranksResolver.refresh()
      }
    })
  }

  public username(query: string): string[] {
    return Autocomplete.search(query, this.usernames)
  }

  public rank(query: string): string[] {
    return Autocomplete.search(query, this.guildRanks)
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
  public static search(query: string, collection: string[]): string[] {
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

  private addUsername(username: string): void {
    const loweredCase = username.toLowerCase()
    if (this.loweredCaseUsernames.has(loweredCase)) return
    this.loweredCaseUsernames.add(loweredCase)
    this.usernames.push(username)
  }

  private addRank(rank: string): void {
    if (!this.guildRanks.includes(rank)) {
      this.guildRanks.push(rank)
    }
  }

  private async fetchGuildInfo(): Promise<void> {
    const tasks = []
    for (const instance of this.application.minecraftManager.getAllInstances()) {
      if (instance.currentStatus() !== Status.Connected) continue

      const task = this.application.usersManager.guildManager
        .listMembers(instance.instanceName, 60_000)
        .then((members) => {
          for (const { rank, usernames } of members) {
            this.addRank(rank)
            for (const username of usernames) {
              this.addUsername(username)
            }
          }
        })
        .catch(() => undefined)

      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async resolveGuildRanks(): Promise<void> {
    this.logger.debug('Resolving guild ranks from server')

    const guildsResolver = this.application.minecraftManager
      .getMinecraftBots()
      .map((bots) => bots.uuid)
      .map((uuid) => this.application.hypixelApi.getGuild('player', uuid).catch(() => undefined))

    const guilds = await Promise.all(guildsResolver)
    for (const guild of guilds) {
      if (guild === undefined) continue

      for (const rank of guild.ranks) {
        const rankName = rank.name
        this.addRank(rankName)
      }
    }
  }
}
