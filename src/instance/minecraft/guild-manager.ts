import assert from 'node:assert'

import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application'
import type { MinecraftRawChatEvent } from '../../common/application-event'
import { GuildPlayerEventType, MinecraftSendChatPriority } from '../../common/application-event'
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import Duration from '../../utility/duration'
import { Timeout } from '../../utility/timeout'

import type MinecraftInstance from './minecraft-instance'

/*
 * All operations on guild object must be atomic.
 * That means data within must be done within a cycle and not separated by an "async/await".
 * So all data must be "whole" across cycles at all times.
 */
export class GuildManager extends SubInstance<MinecraftInstance, void> {
  public static readonly DefaultDataExpire = Duration.seconds(30)
  private readonly commandQueue = new PromiseQueue(1)
  private guildData: GuildFetch | undefined
  private motdData: GuildMOTD | undefined

  public constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<MinecraftInstance>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler, abortSignal)

    this.application.on('guildPlayer', (event) => {
      switch (event.type) {
        case GuildPlayerEventType.Kicked:
        case GuildPlayerEventType.Joined: {
          this.guildData = undefined
          this.motdData = undefined
        }
      }
    })
  }

  /**
   * Fetch online players in a guild
   *
   * @param newerThan duration in milliseconds of how old the data can be at most
   * @return an object containing
   */
  public async list(newerThan: Duration = GuildManager.DefaultDataExpire): Promise<Readonly<GuildFetch>> {
    const getCached = () => {
      if (this.guildData === undefined || this.guildData.fetchedAt + newerThan.toMilliseconds() < Date.now()) {
        return
      }

      return this.guildData
    }

    let guild = getCached()
    if (guild !== undefined) return guild

    return await this.queueTask(async () => {
      // check again in an atomic operation before fetching again
      // since there is a chance previous task has already fetched the data while awaiting in queue
      guild = getCached()
      if (guild !== undefined) return guild

      guild = await this.listNow()
      this.guildData = guild
      return guild
    })
  }

  /**
   * Fetch a guild MOTD
   *
   * @param newerThan duration in milliseconds of how old the data can be at most
   * @return an object containing the requested data
   */
  public async motd(newerThan: Duration = GuildManager.DefaultDataExpire): Promise<Readonly<GuildMOTD>> {
    const getCached = () => {
      if (this.motdData === undefined || this.motdData.fetchedAt + newerThan.toMilliseconds() < Date.now()) {
        return
      }

      return this.motdData
    }

    let motd = getCached()
    if (motd !== undefined) return motd

    return await this.queueTask(async () => {
      // check again in an atomic operation before fetching again
      // since there is a chance previous task has already fetched the data while awaiting in queue
      motd = getCached()
      if (motd !== undefined) return motd

      motd = await this.motdNow()
      this.motdData = motd
      return motd
    })
  }

  public async invite(username: string): Promise<GuildInviteStatus> {
    return await this.queueTask(() => this.inviteNow(username))
  }

  /**
   * Finish previous task before calling the new task to execute.
   * All operations in the task but be atomic and fully valid by the end of every cycle in the promise.
   *
   * @param task a callback that will be executed to start the new promise AFTER the old task has finished executing
   */
  public async queueTask<T>(task: () => Promise<T>): Promise<T> {
    return this.commandQueue.add(task)
  }

  private async listNow(): Promise<Readonly<GuildFetch>> {
    const instance = this.clientInstance
    const timeout = new Timeout<GuildManagerError | undefined>(10_000)
    const guild: GuildFetch = { fetchedAt: Date.now(), name: '', members: [] }

    let currentRank: string | undefined = undefined

    const nameRegex = /^Guild Name: ([\W\w]{1,64})/g
    const rankRegex = /^\s+-- (Guild Master|[\S -]{1,16}) --$/g
    const memberRegex = /(?:§\w|)(\w{2,16})(§\w) \u25CF/g
    const totalRegex = /^Total Members: (\d+)$/g
    const onlineRegex = /^Online Members: (\d+)$/g

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.message.length === 0) return
      if (event.instance !== instance) return

      const nameMatch = nameRegex.exec(event.message)
      if (nameMatch != undefined) {
        guild.name = nameMatch[1]
        return
      }

      const rankMatch = rankRegex.exec(event.message)
      if (rankMatch != undefined) {
        // ranks can end with space but will not show up in chat messages
        currentRank = rankMatch[1].trim()
        return
      }

      let usernameMatch: RegExpExecArray | null
      while ((usernameMatch = memberRegex.exec(event.rawMessage)) != undefined) {
        if (currentRank === undefined) {
          timeout.resolve(new GuildManagerError('Detected members before detecting rank somehow!'))
          return
        }

        const username = usernameMatch[1]
        if (guild.members.some((member) => member.username === username)) continue

        switch (usernameMatch[2]) {
          case '§c': {
            guild.members.push({ username: username, rank: currentRank, online: false })
            // player offline. do nothing
            break
          }
          case '§a': {
            guild.members.push({ username: username, rank: currentRank, online: true })
            break
          }
          default: {
            throw new GuildManagerError(`invalid online indicator character: ${usernameMatch[0]}`)
          }
        }
      }

      const totalMatch = totalRegex.exec(event.message)
      if (totalMatch != undefined) {
        const displayed = Number(totalMatch[1])
        const detected = guild.members.length

        if (detected !== displayed) {
          timeout.resolve(
            new GuildManagerError(
              `Detected guild total members count does not match the displayed amount. ` +
                `detected=${detected}, displayed=${displayed}`
            )
          )
          return
        }
      }

      const onlineMatch = onlineRegex.exec(event.message)
      if (onlineMatch != undefined) {
        const displayed = Number(onlineMatch[1])
        const detected = guild.members.filter((member) => member.online).length

        if (detected !== displayed) {
          timeout.resolve(
            new GuildManagerError(
              `Detected guild online members count does not match the displayed amount. ` +
                `detected=${detected}, displayed=${displayed}`
            )
          )
          return
        }

        timeout.resolve(undefined) // online message is the last in the listing output
        return
      }
    }

    this.application.on('minecraftChat', chatListener)
    await instance.send(`/guild list`, MinecraftSendChatPriority.High, undefined)
    timeout.refresh()
    const error = await timeout.wait()
    this.application.off('minecraftChat', chatListener)
    if (error) throw error
    if (timeout.timedOut()) throw new GuildManagerError('Timed out before fully fetching guild listing data')

    assert.ok(guild.name.length > 0, 'Could not detect any guild name somehow')
    assert.ok(guild.members.length > 0, 'Could not detect any members at all??')
    return Object.freeze(guild)
  }

  private async motdNow(): Promise<Readonly<GuildMOTD>> {
    const instance = this.clientInstance
    const timeout = new Timeout<GuildManagerError | undefined>(10_000)
    const motd: GuildMOTD = { fetchedAt: Date.now(), lines: { type: 'empty' } }

    let header: GuildMOTDLine | undefined = undefined
    let footer: GuildMOTDLine | undefined = undefined
    const lines: GuildMOTDLines['content'] = []

    const startDetection = /^-{10} {2}Guild: Message Of The Day \(Preview\) {2}-{10}/g
    const linePrefixRaw = '§b| '
    const linePrefix = '| '
    const endDetection = /^§b§m-{53}$/g
    const noMotd = /^There is no Guild MOTD!$/g
    let started = false

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.instance !== instance) return

      if (noMotd.test(event.message)) {
        timeout.resolve(undefined)
        return
      }

      const isStarting = startDetection.test(event.message)
      const isEnding = endDetection.test(event.rawMessage)
      if (started && isEnding) {
        footer = { content: event.message, raw: event.rawMessage } satisfies GuildMOTDLine
        timeout.resolve(undefined)
        return
      } else if (isStarting) {
        header = { content: event.message, raw: event.rawMessage } satisfies GuildMOTDLine
        started = isStarting
        return
      } else if (started && event.rawMessage.startsWith(linePrefixRaw)) {
        lines.push({
          clean: { content: event.message.slice(linePrefix.length), raw: event.rawMessage.slice(linePrefixRaw.length) },
          withPrefix: { content: event.message, raw: event.rawMessage }
        })
      }
    }

    this.application.on('minecraftChat', chatListener)
    await instance.send(`/guild motd preview`, MinecraftSendChatPriority.High, undefined)
    timeout.refresh()
    const error = await timeout.wait()
    this.application.off('minecraftChat', chatListener)
    if (error) throw error
    if (timeout.timedOut()) throw new GuildManagerError('Timed out before fully fetching guild motd data')

    if (lines.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(header !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(footer !== undefined)
      motd.lines = { type: 'exists', header: header, footer: footer, content: lines }
    }

    return Object.freeze(motd)
  }

  private async inviteNow(username: string): Promise<GuildInviteStatus> {
    const instance = this.clientInstance
    const InviteAcceptChat: { regex: RegExp; type: GuildInviteStatus }[] = [
      { regex: /^Your guild is full!/, type: GuildInviteStatus.GuildFull },
      {
        regex: /^You invited (?:\[[+A-Z]{1,10}] )*(\w{3,32}) to your guild. They have 5 minutes to accept/,
        type: GuildInviteStatus.OnlineInvite
      },
      {
        regex:
          /^You sent an offline invite to (?:\[[+A-Z]{1,10}] )*(\w{3,32})! They will have 5 minutes to accept once they come online!/,
        type: GuildInviteStatus.OfflineInvite
      },
      {
        regex: /^You've already invited (?:\[[+A-Z]{1,10}] )*(\w{3,32}) to your guild! Wait for them to accept!/,
        type: GuildInviteStatus.AlreadyInvited
      },
      { regex: /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) joined the guild!/, type: GuildInviteStatus.Joined },
      { regex: /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is already in your guild!/, type: GuildInviteStatus.AlreadyJoined },
      { regex: /^You cannot invite this player to your guild!/, type: GuildInviteStatus.PlayerPrivate },
      { regex: /^You do not have permission to invite players!/, type: GuildInviteStatus.NoPermission },
      { regex: /^You do not have permission to use this command!/, type: GuildInviteStatus.NoPermission },
      { regex: /^Your guild rank does not have permission to use this!/, type: GuildInviteStatus.NoPermission },
      {
        regex: /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is already in another guild!/,
        type: GuildInviteStatus.AlreadyInGuild
      },
      { regex: /^Can't find a player by the name of '(\w{3,32})'*/, type: GuildInviteStatus.InvalidUsername }
    ]

    const timeout = new Timeout<GuildInviteStatus>(10_000)

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.instance !== instance) return

      for (const entry of InviteAcceptChat) {
        const match = entry.regex.exec(event.message)
        if (match === null) continue
        if (match.length > 1 && match[1].toLowerCase() !== username.toLowerCase()) continue
        timeout.resolve(entry.type)
      }
    }

    this.application.on('minecraftChat', chatListener)
    await instance.send(`/guild invite ${username}`, MinecraftSendChatPriority.High, undefined)
    timeout.refresh()
    const result = await timeout.wait()
    this.application.off('minecraftChat', chatListener)
    if (timeout.timedOut()) throw new GuildManagerError(`Timed out before while trying to invite ${username}`)
    assert.ok(result !== undefined)

    return result
  }
}

export interface GuildFetch {
  fetchedAt: number

  name: string
  members: GuildMember[]
}

export interface GuildMember {
  username: string
  rank: string
  online: boolean
}

export interface GuildMOTD {
  fetchedAt: number

  lines: { type: 'empty' } | GuildMOTDLines
}

export interface GuildMOTDLines {
  type: 'exists'
  header: GuildMOTDLine
  footer: GuildMOTDLine
  content: { clean: GuildMOTDLine; withPrefix: GuildMOTDLine }[]
}

export interface GuildMOTDLine {
  content: string
  raw: string
}

export class GuildManagerError extends Error {
  public constructor(message: string) {
    super(message)
  }
}

export enum GuildInviteStatus {
  GuildFull = 'guildFull',
  Joined = 'joined',
  AlreadyInvited = 'alreadyInvited',
  OnlineInvite = 'onlineInvite',
  PlayerPrivate = 'playerPrivate',
  AlreadyJoined = 'alreadyJoined',
  OfflineInvite = 'offlineInvite',
  AlreadyInGuild = 'alreadyInGuild',
  NoPermission = 'noPermission',
  InvalidUsername = 'invalidUsername'
}
