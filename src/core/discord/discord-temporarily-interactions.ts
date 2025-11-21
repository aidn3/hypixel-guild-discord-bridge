import type { SqliteManager } from '../../common/sqlite-manager'

import type { DiscordConfigurations } from './discord-configurations'

export class DiscordTemporarilyInteractions {
  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly discordConfigurations: DiscordConfigurations
  ) {}

  public add(entries: DiscordMessage[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT OR REPLACE INTO "discordTempInteractions" (messageId, channelId,createdAt) VALUES (?, ?, ?)'
      )
      for (const entry of entries) {
        insert.run(entry.messageId, entry.channelId, Math.floor(entry.createdAt / 1000))
      }
    })

    transaction()
  }

  public findToDelete(): DiscordMessage[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const currentTime = Date.now()
      const maxInteractions = this.discordConfigurations.getMaxTemporarilyInteractions()
      const duration = this.discordConfigurations.getDurationTemporarilyInteractions()

      const select = database.prepare('SELECT * FROM "discordTempInteractions"')
      const allInteractions = select.all() as DiscordMessage[]

      const toDelete: DiscordMessage[] = []

      allInteractions
        // reversed to ease the sorting since the list is mostly created chronologically
        // eslint-disable-next-line unicorn/no-array-reverse
        .reverse()
        .sort((a, b) => b.createdAt - a.createdAt)

      const interactionsCount = new Map<string, number>()
      for (const interaction of allInteractions) {
        if (interaction.createdAt * 1000 + duration.toMilliseconds() < currentTime) {
          toDelete.push(interaction)
          continue
        }

        const currentInteractionsCount = interactionsCount.get(interaction.channelId) ?? 0
        if (currentInteractionsCount >= maxInteractions) {
          toDelete.push(interaction)
          continue
        }

        interactionsCount.set(interaction.channelId, currentInteractionsCount + 1)
      }

      return toDelete
    })

    return transaction()
  }

  public remove(messagesIds: DiscordMessage['messageId'][]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordTempInteractions" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}

export interface DiscordMessage {
  channelId: string
  messageId: string
  createdAt: number
}
