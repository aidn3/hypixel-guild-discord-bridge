import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type { InstanceType, MinecraftRawChatEvent } from '../../../common/application-event.js'
import { MinecraftSendChatPriority } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import Duration from '../../../utility/duration'
import { Timeout } from '../../../utility/timeout.js'
import type UsersManager from '../users-manager.js'

export class GuildManager extends EventHandler<UsersManager, InstanceType.Utility, void> {
  public static readonly DefaultDataExpire = Duration.seconds(30)
  private readonly guildInfo = new Map<string, GuildInformation>()

  /**
   * Fetch online players in a guild
   *
   * @param instanceName the minecraft instance name to fetch the stats from
   * @param newerThan duration in milliseconds of how old the data can be at most
   *
   * @return an object containing
   */
  public async list(
    instanceName: string,
    newerThan: Duration = GuildManager.DefaultDataExpire
  ): Promise<Readonly<GuildFetch>> {
    const guildInfo = this.getGuildInfo(instanceName)
    const getCached = () => {
      if (guildInfo.guild === undefined || guildInfo.guild.fetchedAt + newerThan.toMilliseconds() < Date.now()) {
        return
      }

      return guildInfo.guild
    }

    let guild = getCached()
    if (guild !== undefined) return guild

    return await this.queueTask(guildInfo, async () => {
      // check again in an atomic operation before fetching again
      // since there is a chance previous task has already fetched the data while awaiting in queue
      guild = getCached()
      if (guild !== undefined) return guild

      guild = await this.listNow(instanceName)
      guildInfo.guild = guild
      return guild
    })
  }

  private getGuildInfo(instanceName: string): GuildInformation {
    let guild = this.guildInfo.get(instanceName)
    if (guild === undefined) {
      guild = { commandQueue: new PromiseQueue(1), guild: undefined }
      this.guildInfo.set(instanceName, guild)
    }

    return guild
  }

  /**
   * Finish previous task before calling the new task to execute.
   * All operations in the task but be atomic and fully valid by the end of every cycle in the promise.
   *
   * @param guild the guild object OR instanceName string
   * @param task a callback that will be executed to start the new promise AFTER the old task has finished executing
   */
  public async queueTask<T>(guild: GuildInformation | string, task: () => Promise<T>): Promise<T> {
    if (typeof guild === 'string') guild = this.getGuildInfo(guild)
    return guild.commandQueue.add(task)
  }

  /*
   * All operations on guild object must be atomic.
   * That means data within must be done within a cycle and not separated by an "async/await".
   * So all data must be "whole" across cycles at all times.
   */
  private async listNow(instanceName: string): Promise<Readonly<GuildFetch>> {
    const timeout = new Timeout<Error | undefined>(10_000)
    const guild: GuildFetch = { fetchedAt: Date.now(), name: '', members: [] }

    let currentRank: string | undefined = undefined

    const nameRegex = /^Guild Name: ([\W\w]{1,64})/g
    const rankRegex = /^\s+-- (Guild Master|[\S -]{1,16}) --$/g
    const memberRegex = /(?:§\w|)(\w{2,16})(§\w) \u25CF/g
    const totalRegex = /^Total Members: (\d+)$/g
    const onlineRegex = /^Online Members: (\d+)$/g

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.message.length === 0) return
      if (event.instanceName !== instanceName) return

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
          timeout.resolve(new Error('Detected members before detecting rank somehow!'))
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
            throw new Error(`invalid online indicator character: ${usernameMatch[0]}`)
          }
        }
      }

      const totalMatch = totalRegex.exec(event.message)
      if (totalMatch != undefined) {
        const displayed = Number(totalMatch[1])
        const detected = guild.members.length

        if (detected !== displayed) {
          timeout.resolve(
            new Error(
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
            new Error(
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
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [instanceName],
      priority: MinecraftSendChatPriority.High,
      command: `/guild list`
    })
    const error = await timeout.wait()
    this.application.removeListener('minecraftChat', chatListener)
    if (error) throw error
    if (timeout.timedOut()) throw new Error('Timed out before fully fetching guild listing data')

    assert.ok(guild.name.length > 0, 'Could not detect any guild name somehow')
    assert.ok(guild.members.length > 0, 'Could not detect any members at all??')
    return Object.freeze(guild)
  }
}

interface GuildInformation {
  commandQueue: PromiseQueue

  guild: GuildFetch | undefined
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
