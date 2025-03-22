import assert from 'node:assert'

import { MinecraftSendChatPriority } from '../../../common/application-event.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { sleep } from '../../../util/shared-util.js'

export enum CommandType {
  Generic = 'generic',
  HighPriority = 'high_priority',
  ChatMessage = 'chat_message',
  GuildCommand = 'guild_command'
}

const CommandTypeSleep: Record<CommandType, number> = {
  [CommandType.Generic]: 1000,
  [CommandType.HighPriority]: 700,
  [CommandType.ChatMessage]: 3000,
  [CommandType.GuildCommand]: 2000
}

export class SendQueue {
  private readonly queuedEntries: QueueEntry[] = []
  private cycleStarted = false
  public readonly lastId = new Map<CommandType, string>()

  constructor(
    private readonly errorHandler: UnexpectedErrorHandler,
    private readonly sender: (command: string) => void
  ) {}

  public async queue(command: string, priority: MinecraftSendChatPriority, eventId: string | undefined): Promise<void> {
    const commandTypes = SendQueue.resolveTypes(command, priority)

    if (priority === MinecraftSendChatPriority.Instant) {
      if (eventId !== undefined) {
        for (const type of commandTypes.types) {
          this.lastId.set(type, eventId)
        }
      }
      this.sender(command)
      return
    }

    return new Promise((resolve) => {
      const entry: QueueEntry = { resolve, command, eventId, ...commandTypes }

      this.queuedEntries.push(entry)
      this.queuedEntries.sort((a, b) => a.priority - b.priority)

      if (!this.cycleStarted) {
        this.cycleStarted = true
        void this.startCycle().catch((error: unknown) => {
          this.cycleStarted = false
          this.errorHandler.promiseCatch('queuing commands via minecraft instance')(error)
        })
      }
    })
  }

  private async startCycle(): Promise<void> {
    while (this.queuedEntries.length > 0) {
      const entryToExecute = this.queuedEntries.shift()
      assert(entryToExecute)

      if (entryToExecute.eventId !== undefined) {
        for (const type of entryToExecute.types) {
          this.lastId.set(type, entryToExecute.eventId)
        }
      }
      this.sender(entryToExecute.command)
      entryToExecute.resolve()

      await this.sleepBetweenCommands(entryToExecute)
    }

    this.cycleStarted = false
  }

  /**
   * Sleep max 500millisecond before checking again
   * if the queue has changed and require less sleep overall.
   *
   */
  private async sleepBetweenCommands(currentEntry: QueueEntry): Promise<void> {
    const checkEvery = 500
    const allTimes = currentEntry.types.map((type) => CommandTypeSleep[type]).sort((a, b) => a - b)

    let sleptSoFar = 0
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,no-constant-condition
    while (true) {
      let maxSleep: number
      if (this.queuedEntries.length === 0) {
        maxSleep = Math.max(...allTimes)
      } else {
        const nextEntry = this.queuedEntries[0]
        maxSleep =
          SendQueue.requireId(currentEntry) === SendQueue.requireId(nextEntry) &&
          !nextEntry.types.includes(CommandType.HighPriority)
            ? Math.max(...allTimes)
            : Math.min(...allTimes)
      }

      if (sleptSoFar >= maxSleep) return
      const sleepTime = Math.min(checkEvery, maxSleep - sleptSoFar)

      // timestamp used to account for async/await lag
      const currentTimestamp = Date.now()
      await sleep(sleepTime - sleptSoFar)
      sleptSoFar += Date.now() - currentTimestamp
    }
  }

  private static resolveTypes(
    command: string,
    commandPriority: MinecraftSendChatPriority
  ): { types: CommandType[]; priority: number } {
    const types: CommandType[] = []
    let priority = 3

    const chatPrefix = ['/ac', '/pc', '/gc', '/gchat', '/oc', '/ochat', '/msg', '/whisper', '/w', 'tell']
    const guildPrefix = [
      '/g ',
      '/guild',
      '/gc',
      'gchat',
      '/oc',
      'ochat',
      '/chat guild',
      '/chat g',
      '/chat officer',
      '/chat o',
      '/c g',
      '/c guild',
      '/c o',
      '/c officer'
    ]

    const loweredCaseCommand = command.toLowerCase()

    if (guildPrefix.some((prefix) => loweredCaseCommand.startsWith(prefix))) {
      types.push(CommandType.GuildCommand)
      priority = 5
    }
    if (chatPrefix.some((prefix) => loweredCaseCommand.startsWith(prefix)) || !loweredCaseCommand.startsWith('/')) {
      types.push(CommandType.ChatMessage)
      priority = 10
    }
    if (commandPriority === MinecraftSendChatPriority.High) {
      types.push(CommandType.HighPriority)
      priority = 1
    }

    types.push(CommandType.Generic)
    return { types, priority }
  }

  private static requireId(entry: QueueEntry): boolean {
    return entry.types.some((type) => [CommandType.ChatMessage, CommandType.GuildCommand].includes(type))
  }
}

interface QueueEntry {
  resolve: () => void
  priority: number
  command: string
  eventId: string | undefined
  types: CommandType[]
}
