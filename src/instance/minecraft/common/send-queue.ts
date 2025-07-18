import assert from 'node:assert'

import { ChannelType, MinecraftSendChatPriority } from '../../../common/application-event.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { Timeout } from '../../../utility/timeout.js'

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

// noinspection InfiniteLoopJS
export class SendQueue {
  private priorityQueue = new PriorityQueue()

  public readonly lastId = new Map<CommandType, string>()
  private entryContext: EntryContext | undefined

  private threadSleep: Timeout<void> | undefined

  constructor(
    private readonly errorHandler: UnexpectedErrorHandler,
    private readonly sender: (command: string) => void
  ) {
    void Promise.resolve()
      .then(async () => {
        try {
          await this.startCycle()
        } catch (error: unknown) {
          errorHandler.promiseCatch('queuing commands via minecraft instance')(error)
        }
      })
      .catch(errorHandler.promiseCatch('sending queue loop'))
  }

  public notifyChatEvent(channel: ChannelType, message: string): void {
    if (this.entryContext === undefined) return
    const channels = [
      { type: ChannelType.Public, prefix: '/gc ' },
      { type: ChannelType.Officer, prefix: '/oc ' }
    ]

    const entryCommand = this.entryContext.entry.command
    for (const potentialChannel of channels) {
      if (channel !== potentialChannel.type) continue
      if (!entryCommand.toLowerCase().startsWith(potentialChannel.prefix)) continue

      const entryMessage = entryCommand.slice(potentialChannel.prefix.length)
      if (entryMessage === message) {
        this.entryContext.skip = true
        this.entryContext.sleep?.resolve()
      }
    }
  }

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
      this.priorityQueue.add(entry)
      this.notify()
    })
  }

  private notify(): void {
    if (this.threadSleep !== undefined) this.threadSleep.resolve()
    if (this.entryContext !== undefined) this.entryContext.sleep?.resolve()
  }

  private async startCycle(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      while (this.priorityQueue.empty()) {
        this.threadSleep = new Timeout(~(1 << 31)) // max 32bit integer
        await this.threadSleep.wait()
      }

      const entryToExecute = this.priorityQueue.pop()

      if (entryToExecute.eventId !== undefined) {
        for (const type of entryToExecute.types) {
          this.lastId.set(type, entryToExecute.eventId)
        }
      }
      this.sender(entryToExecute.command)
      entryToExecute.resolve()

      await this.sleepBetweenCommands(entryToExecute)
    }
  }

  private async sleepBetweenCommands(currentEntry: QueueEntry): Promise<void> {
    const context: EntryContext = { sleep: undefined, skip: false, entry: currentEntry }
    this.entryContext = context

    const allTimes = currentEntry.types.map((type) => CommandTypeSleep[type]).sort((a, b) => a - b)

    let sleptSoFar = 0
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      let maxSleep: number
      if (this.priorityQueue.empty()) {
        maxSleep = Math.max(...allTimes)
      } else {
        const nextEntry = this.priorityQueue.peek()
        maxSleep =
          SendQueue.requireId(currentEntry) === SendQueue.requireId(nextEntry) &&
          !nextEntry.types.includes(CommandType.HighPriority)
            ? Math.max(...allTimes)
            : Math.min(...allTimes)
      }

      if (context.skip) maxSleep = Math.min(...allTimes)
      if (sleptSoFar >= maxSleep) return

      // timestamp used to account for async/await lag
      const currentTimestamp = Date.now()
      context.sleep = new Timeout<void>(maxSleep - sleptSoFar)
      await context.sleep.wait()
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

class PriorityQueue {
  private readonly entries: QueueEntry[] = []

  public add(entry: QueueEntry): void {
    this.entries.push(entry)
    this.entries.sort((a, b) => a.priority - b.priority)
  }

  public pop(): QueueEntry {
    const entry = this.entries.shift()
    assert.ok(entry !== undefined)
    return entry
  }

  public empty(): boolean {
    return this.entries.length === 0
  }

  public peek(): QueueEntry {
    assert.ok(this.entries.length > 0)
    return this.entries[0]
  }
}

interface QueueEntry {
  resolve: () => void
  priority: number
  command: string
  eventId: string | undefined

  types: CommandType[]
}

interface EntryContext {
  entry: QueueEntry
  sleep: Timeout<void> | undefined
  skip: boolean
}
