import assert from 'node:assert'

import type Application from '../application.js'
import type { MinecraftRawChatEvent } from '../common/application-event.js'
import { InstanceType, MinecraftSendChatPriority } from '../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../common/instance.js'

import { Timeout } from './timeout.js'

export class GuildManager extends Instance<InstanceType.Util> {
  public static readonly DefaultDataExpire = 30 * 1000
  private readonly guildInfo = new Map<string, GuildInformation>()

  public constructor(application: Application) {
    super(application, InternalInstancePrefix + 'GuildManager', InstanceType.Util)
  }

  public async totalMembers(instanceName: string, newerThan: number = GuildManager.DefaultDataExpire): Promise<number> {
    const guildInfo = this.getGuildInfo(instanceName)
    const oldData = () =>
      guildInfo.totalMembersCount === undefined || guildInfo.totalMembersCount.createdAt + newerThan < Date.now()

    if (oldData()) {
      await this.queueTask(guildInfo, async () => {
        // check again in an atomic operation before fetching again
        // since there is a chance previous task has already fetched the data while awaiting in queue
        if (!oldData()) return

        await this.list(instanceName, 'all')
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert(guildInfo.totalMembersCount)
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

        await this.list(instanceName, 'all')
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert(guildInfo.totalOnlineMembers)
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

        await this.list(instanceName, 'all')
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert(guildInfo.listAll)
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

        await this.list(instanceName, 'online')
        if (oldData()) throw new Error('Could not fetch fresh data')
      })
    }

    assert(guildInfo.listOnline)
    return guildInfo.listOnline.members
  }

  private getGuildInfo(instanceName: string): GuildInformation {
    let guild = this.guildInfo.get(instanceName)
    if (guild === undefined) {
      guild = { commandQueue: Promise.resolve() }
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
    const oldTask = guild.commandQueue

    let resolveNewTask: undefined | ((v: unknown) => void)
    const newTask = new Promise((resolve) => {
      resolveNewTask = resolve
    })
    assert(resolveNewTask)

    guild.commandQueue = newTask
    await oldTask
    const chainedNewTask = newTask.then(() => task())
    resolveNewTask(true)

    return chainedNewTask
  }

  /*
   * All operations on guild object must be atomic.
   * That means data within must be done within a cycle and not separated by an "async/await".
   * So all data must be "whole" across cycles at all times.
   */
  private async list(instanceName: string, status: 'all' | 'online'): Promise<void> {
    const timeout = new Timeout(10_000)
    const guild = this.getGuildInfo(instanceName)

    const members: { rank: string; usernames: Set<string> }[] = []
    let currentRank: string | undefined = undefined
    let usernames: Set<string> = new Set<string>()

    const nameRegex = /^Guild Name: ([\W\w]{1,64})/g
    const rankRegex = /^\W+-- (Guild Master|\w+) --$/g
    const memberRegex = /(\w{2,16}) \u25CF/g
    const totalRegex = /^Total Members: (\d+)$/g
    const onlineRegex = /^Online Members: (\d+)$/g

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.message.length === 0) return

      const nameMatch = nameRegex.exec(event.message)
      if (nameMatch != undefined) {
        guild.name = { createdAt: Date.now(), name: nameMatch[1] }
        return
      }

      const rankMatch = rankRegex.exec(event.message)
      if (rankMatch != undefined) {
        if (currentRank !== undefined) {
          members.push({ rank: currentRank, usernames: usernames })
          usernames = new Set<string>()
        }
        currentRank = rankMatch[1]
        return
      }

      if (currentRank !== undefined) {
        let usernameMatch = memberRegex.exec(event.message)
        while (usernameMatch != undefined) {
          usernames.add(usernameMatch[1])
          usernameMatch = memberRegex.exec(event.message)
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
      command: `/guild ${status === 'all' ? 'list' : 'online'}`
    })
    await timeout.wait()
    this.application.removeListener('minecraftChat', chatListener)

    // false positive
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (currentRank !== undefined && usernames.size > 0) {
      members.push({ rank: currentRank, usernames: usernames })
    }
    if (members.length > 0) {
      if (status === 'online') {
        guild.listOnline = { createdAt: Date.now(), members: members }
      } else {
        guild.listAll = { createdAt: Date.now(), members: members }
      }
    }
  }
}

interface GuildInformation {
  commandQueue: Promise<unknown>

  name?: { name: string } & Metadata
  listAll?: { members: { rank: string; usernames: Set<string> }[] } & Metadata
  listOnline?: { members: { rank: string; usernames: Set<string> }[] } & Metadata
  totalMembersCount?: { count: number } & Metadata
  totalOnlineMembers?: { count: number } & Metadata
}

interface Metadata {
  createdAt: number
}
