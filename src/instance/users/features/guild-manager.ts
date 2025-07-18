import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type { InstanceType, MinecraftRawChatEvent } from '../../../common/application-event.js'
import { MinecraftSendChatPriority } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import { Timeout } from '../../../utility/timeout.js'
import type UsersManager from '../users-manager.js'

export class GuildManager extends EventHandler<UsersManager, InstanceType.Utility, void> {
  public static readonly DefaultDataExpire = 30 * 1000
  private readonly guildInfo = new Map<string, GuildInformation>()

  public async totalMembers(instanceName: string, newerThan: number = GuildManager.DefaultDataExpire): Promise<number> {
    const guildInfo = this.getGuildInfo(instanceName)
    const oldData = () =>
      guildInfo.totalMembersCount === undefined || guildInfo.totalMembersCount.createdAt + newerThan < Date.now()

    if (oldData()) {
      await this.queueTask(guildInfo, async () => {
        // check again in an atomic operation before fetching again
        // since there is a chance previous task has already fetched the data while awaiting in queue
        if (!oldData()) return

        await this.list(instanceName)
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert.ok(guildInfo.totalMembersCount)
    return guildInfo.totalMembersCount.count
  }

  public async totalOnline(instanceName: string, newerThan: number = GuildManager.DefaultDataExpire): Promise<number> {
    const guildInfo = this.getGuildInfo(instanceName)
    const oldData = () =>
      guildInfo.totalOnlineMembers === undefined || guildInfo.totalOnlineMembers.createdAt + newerThan < Date.now()

    if (oldData()) {
      await this.queueTask(guildInfo, async () => {
        // check again in an atomic operation before fetching again
        // since there is a chance previous task has already fetched the data while awaiting in queue
        if (!oldData()) return

        await this.list(instanceName)
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert.ok(guildInfo.totalOnlineMembers)
    return guildInfo.totalOnlineMembers.count
  }

  public async listMembers(
    instanceName: string,
    newerThan: number = GuildManager.DefaultDataExpire
  ): Promise<{ rank: string; usernames: Set<string> }[]> {
    const guildInfo = this.getGuildInfo(instanceName)
    const oldData = () => guildInfo.listAll === undefined || guildInfo.listAll.createdAt + newerThan < Date.now()

    if (oldData()) {
      await this.queueTask(guildInfo, async () => {
        // check again in an atomic operation before fetching again
        // since there is a chance previous task has already fetched the data while awaiting in queue
        if (!oldData()) return

        await this.list(instanceName)
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert.ok(guildInfo.listAll)
    return guildInfo.listAll.members
  }

  /**
   * Fetch online players in a guild
   *
   * @param instanceName the minecraft instance name to fetch the stats from
   * @param newerThan duration in milliseconds of how old the data can be at most
   * @return a map where the key is the rank and the value is the usernames list
   */
  public async onlineMembers(
    instanceName: string,
    newerThan: number = GuildManager.DefaultDataExpire
  ): Promise<{ rank: string; usernames: Set<string> }[]> {
    const guildInfo = this.getGuildInfo(instanceName)
    const oldData = () => guildInfo.listOnline === undefined || guildInfo.listOnline.createdAt + newerThan < Date.now()

    if (oldData()) {
      await this.queueTask(guildInfo, async () => {
        // check again in an atomic operation before fetching again
        // since there is a chance previous task has already fetched the data while awaiting in queue
        if (!oldData()) return

        await this.list(instanceName)
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert.ok(guildInfo.listOnline)
    return guildInfo.listOnline.members
  }

  private getGuildInfo(instanceName: string): GuildInformation {
    let guild = this.guildInfo.get(instanceName)
    if (guild === undefined) {
      guild = { commandQueue: new PromiseQueue(1) }
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
  private async list(instanceName: string): Promise<void> {
    const timeout = new Timeout(10_000)
    const guild = this.getGuildInfo(instanceName)

    const allMembers: { rank: string; usernames: Set<string> }[] = []
    const onlineMembers: { rank: string; usernames: Set<string> }[] = []
    let allUsernames: Set<string> | undefined
    let onlineUsernames: Set<string> | undefined

    const nameRegex = /^Guild Name: ([\W\w]{1,64})/g
    const rankRegex = /^\W+-- (Guild Master|[\w -]+) --$/g
    const memberRegex = /(?:§\w|)(\w{2,16})(§\w) \u25CF/g
    const totalRegex = /^Total Members: (\d+)$/g
    const onlineRegex = /^Online Members: (\d+)$/g

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.message.length === 0) return
      if (event.instanceName !== instanceName) return

      const nameMatch = nameRegex.exec(event.message)
      if (nameMatch != undefined) {
        guild.name = { createdAt: Date.now(), name: nameMatch[1] }
        return
      }

      const rankMatch = rankRegex.exec(event.message)
      if (rankMatch != undefined) {
        // ranks can end with space but will not show up in chat messages
        const rank = rankMatch[1].trim()

        allUsernames = new Set<string>()
        allMembers.push({ rank: rank.trim(), usernames: allUsernames })

        onlineUsernames = new Set<string>()
        onlineMembers.push({ rank: rank.trim(), usernames: onlineUsernames })

        return
      }

      if (allUsernames !== undefined && onlineUsernames !== undefined) {
        let usernameMatch: RegExpExecArray | null
        while ((usernameMatch = memberRegex.exec(event.rawMessage)) != undefined) {
          const username = usernameMatch[1]
          switch (usernameMatch[2]) {
            case '§c': {
              // player offline. do nothing
              break
            }
            case '§a': {
              onlineUsernames.add(username)
              break
            }
            default: {
              throw new Error(`invalid online indicator character: ${usernameMatch[0]}`)
            }
          }

          allUsernames.add(username)
        }
      }

      const totalMatch = totalRegex.exec(event.message)
      if (totalMatch != undefined) guild.totalMembersCount = { createdAt: Date.now(), count: Number(totalMatch[1]) }

      const onlineMatch = onlineRegex.exec(event.message)
      if (onlineMatch != undefined) {
        guild.totalOnlineMembers = { createdAt: Date.now(), count: Number(onlineMatch[1]) }
        timeout.resolve(true) // online message is the last in the listing output
      }
    }

    this.application.on('minecraftChat', chatListener)
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [instanceName],
      priority: MinecraftSendChatPriority.High,
      command: `/guild list`
    })
    await timeout.wait()
    this.application.removeListener('minecraftChat', chatListener)

    if (onlineMembers.length > 0) {
      guild.listOnline = { createdAt: Date.now(), members: onlineMembers }
    }
    if (allMembers.length > 0) {
      guild.listAll = { createdAt: Date.now(), members: allMembers }
    }
  }
}

interface GuildInformation {
  commandQueue: PromiseQueue

  name?: { name: string } & Metadata
  listAll?: { members: { rank: string; usernames: Set<string> }[] } & Metadata
  listOnline?: { members: { rank: string; usernames: Set<string> }[] } & Metadata
  totalMembersCount?: { count: number } & Metadata
  totalOnlineMembers?: { count: number } & Metadata
}

interface Metadata {
  createdAt: number
}
