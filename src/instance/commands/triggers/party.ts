import Moment from 'moment'

import { ChannelType, InstanceType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { getDuration } from '../../../utility/shared-utility'

interface Party {
  username: string
  count: number
  purpose: string
  expiresAt: number
}

export default class PartyManager {
  public activeParties: Party[] = []
  private readonly commands

  constructor() {
    this.commands = [new PartyList(this), new PartyStart(this), new PartyEnd(this)]
  }

  public resolveCommands(): ChatCommandHandler[] {
    return this.commands
  }

  cleanExpiredParties(): void {
    const currentTime = Date.now()
    this.activeParties = this.activeParties.filter((party) => party.expiresAt > currentTime)
  }

  allowedExecution(context: ChatCommandContext): string | undefined {
    const originalMessage = context.message
    if (originalMessage.channelType === ChannelType.Officer || originalMessage.channelType === ChannelType.Public) {
      if (originalMessage.instanceType === InstanceType.Minecraft) return undefined

      if (originalMessage.instanceType === InstanceType.Discord) return undefined
    }

    return 'Parties commands can only be executed in public and officer chat of either minecraft or discord.'
  }
}

class PartyList extends ChatCommandHandler {
  private readonly partyManager

  constructor(partyManager: PartyManager) {
    super({
      triggers: ['parties', 'party', 'listparty', 'listpartys', 'listparties', 'plist'],
      description: 'List all active parties in guild',
      example: `parties`
    })

    this.partyManager = partyManager
  }

  handler(context: ChatCommandContext): string {
    const notAllowed = this.partyManager.allowedExecution(context)
    if (notAllowed) return notAllowed

    this.partyManager.cleanExpiredParties()
    if (this.partyManager.activeParties.length === 0) {
      return `${context.username}, There are no active parties. You can ${context.commandPrefix}startparty`
    }

    let response = `${context.username}, parties: `
    for (const [index, party] of this.partyManager.activeParties.entries()) {
      // utc() is not directly exported
      response += `${index + 1}. ${party.username}, ${party.count} players, ${party.purpose}, with ${Moment.utc(party.expiresAt).fromNow(true)} left\n`
    }

    response += `/p join [name] or message the leader to join one of the parties`
    return response
  }
}

class PartyStart extends ChatCommandHandler {
  private static readonly MinPartySize = 2
  private static readonly MaxPartySize = 100
  private static readonly MaxPurposeLength = 32
  private static readonly MaxDuration = Duration.hours(12)

  private readonly partyManager

  constructor(partyManager: PartyManager) {
    super({
      triggers: ['startparty', 'createparty', 'sparty'],
      description: 'Create public !parties to be viewed by guild members with <count> <time> <purpose>',
      example: `startparty 5 4h m7`
    })

    this.partyManager = partyManager
  }

  handler(context: ChatCommandContext): string {
    const notAllowed = this.partyManager.allowedExecution(context)
    if (notAllowed) return notAllowed

    this.partyManager.cleanExpiredParties()
    const alreadyExistingParty = this.partyManager.activeParties.some((party) => party.username === context.username)
    if (alreadyExistingParty)
      return `${context.username}, you already have an active party. ${context.commandPrefix}endparty first to start a new one.`

    if (context.args.length < 3) return this.getExample(context.commandPrefix)
    const countArgument = context.args[0]
    const timeArgument = context.args[1]
    const purpose = context.args
      .slice(2)
      .map((word) => word.trim())
      .join(' ')
      .trim()

    const count = Number.parseInt(countArgument, 10)
    if (
      Number.isNaN(count) ||
      !/^\d+$/.test(countArgument) ||
      !(count >= PartyStart.MinPartySize && count <= PartyStart.MaxPartySize)
    ) {
      return `${context.username}, party count muse be between ${PartyStart.MinPartySize} and ${PartyStart.MaxPartySize}`
    }
    let duration: Duration
    try {
      duration = getDuration(timeArgument)
    } catch {
      return `${context.username}, party duration must be something like "4h" for 4 hours or "30m" for 30 minutes`
    }
    if (duration.toSeconds() > PartyStart.MaxDuration.toSeconds()) {
      return `${context.username}, party duration must be at most 12 hours. You can recreate the party any time if need more time!`
    }

    if (purpose.length > PartyStart.MaxPurposeLength) {
      return `${context.username}, purpose must be at most ${PartyStart.MaxPurposeLength} character long`
    }

    const party = {
      username: context.username,
      count: count,
      purpose: purpose,
      expiresAt: Date.now() + duration.toMilliseconds()
    } satisfies Party

    this.partyManager.activeParties.push(party)
    return `${context.username}, party started. Don't forget to open your party via /stream and tune in for any messages requesting to join! `
  }
}

class PartyEnd extends ChatCommandHandler {
  private readonly partyManager

  constructor(partyManager: PartyManager) {
    super({
      triggers: ['endparty', 'delparty'],
      description: 'remove the party from the listing',
      example: `endparty`
    })

    this.partyManager = partyManager
  }

  handler(context: ChatCommandContext): string {
    const notAllowed = this.partyManager.allowedExecution(context)
    if (notAllowed) return notAllowed

    this.partyManager.cleanExpiredParties()
    const changedParties = this.partyManager.activeParties.filter((party) => party.username !== context.username)
    const removed = changedParties.length !== this.partyManager.activeParties.length
    if (removed) {
      this.partyManager.activeParties = changedParties
      return `${context.username}, party ended.`
    } else {
      return `${context.username}, you don't have any active party to end. You can ${context.commandPrefix}startparty first`
    }
  }
}
