import assert from 'node:assert'

import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { sleep } from '../../../util/shared-util.js'

export enum CommandType {
  Generic = 'generic',
  ChatMessage = 'chat_message',
  GuildCommand = 'guild_command'
}

const CommandTypeSleep: Record<CommandType, number> = {
  [CommandType.Generic]: 1000,
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

  public async queue(command: string, eventId: string | undefined): Promise<void> {
    return new Promise((resolve) => {
      const entry: QueueEntry = { resolve, command, eventId, ...SendQueue.resolveTypes(command) }

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
    let sleepTime = 1000
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

      const allTimes = entryToExecute.types.map((type) => CommandTypeSleep[type])
      if (this.queuedEntries.length === 0) {
        sleepTime = Math.max(...allTimes)
      } else {
        const nextEntry = this.queuedEntries[0]
        sleepTime =
          SendQueue.requireId(entryToExecute) === SendQueue.requireId(nextEntry)
            ? Math.max(...allTimes)
            : Math.min(...allTimes)
      }

      await sleep(sleepTime)
    }

    this.cycleStarted = false
  }

  private static resolveTypes(command: string): { types: CommandType[]; priority: number } {
    const types: CommandType[] = []
    let priority = 1

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
    if (
      chatPrefix.some((prefix) => loweredCaseCommand.startsWith(prefix)) ||
      // normal chat on default channel and not a command
      (!loweredCaseCommand.startsWith('/') && !loweredCaseCommand.startsWith('§'))
    ) {
      types.push(CommandType.ChatMessage)
      priority = 10
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
