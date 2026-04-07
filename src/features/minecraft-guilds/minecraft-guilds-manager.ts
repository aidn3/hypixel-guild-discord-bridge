import type { Client } from 'discord.js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application'
import type { GuildPlayerEvent } from '../../common/application-event'
import {
  ChannelType,
  Color,
  GuildPlayerEventType,
  InstanceType,
  MinecraftSendChatPriority
} from '../../common/application-event'
import { Status } from '../../common/connectable-instance'
import { Instance, InternalInstancePrefix } from '../../common/instance'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { User } from '../../common/user'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance'
import Duration from '../../utility/duration'
import { setIntervalAsync } from '../../utility/scheduling'

import { discordGuildAutocomplete, DiscordGuildCommand, discordGuildCommandHandler } from './commands/discord-guild'
import Ranks from './commands/ranks'
import Rankup from './commands/rankup'
import type { MinecraftGuild, WaitlistEntry, WaitlistRequestEntry } from './database'
import { Database } from './database'
import { DiscordWaitlistInteraction } from './discord-waitlist-interaction'

export class MinecraftGuildsManager extends Instance<InstanceType.Utility> {
  private readonly detectionQueue = new PromiseQueue(1)
  private readonly database: Database
  private readonly waitlistInteraction: DiscordWaitlistInteraction

  public constructor(application: Application, sqliteManager: SqliteManager) {
    super(application, InternalInstancePrefix + 'minecraft-guilds-manager', InstanceType.Utility)
    this.database = new Database(sqliteManager)
    this.waitlistInteraction = new DiscordWaitlistInteraction(
      this.application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.database,
      this.detectionQueue
    )

    this.application.registerChatCommand(new Ranks(this.database))
    this.application.registerChatCommand(new Rankup(this.database))
    this.application.registerDiscordCommand({
      ...DiscordGuildCommand,
      handler: (context) => discordGuildCommandHandler(context, this.database, this.waitlistInteraction),
      autoComplete: (context) => discordGuildAutocomplete(context, this.database)
    })

    this.application.on('guildPlayer', async (event) => {
      await this.handleJoinRequest(event)
    })

    setIntervalAsync(() => this.detectionQueue.add(() => this.autoRegisterGuilds()), {
      delay: Duration.minutes(1),
      errorHandler: this.errorHandler.promiseCatch('handling autoRegisterGuilds()')
    })
    setIntervalAsync(() => this.detectionQueue.add(() => this.detectAllPlayers()), {
      delay: Duration.minutes(5),
      errorHandler: this.errorHandler.promiseCatch('handling detectPlayers()')
    })

    const discordClient = this.discordClient()
    discordClient.on('messageDelete', (message) => {
      this.database.deleteMessage([message.id])
    })
    discordClient.on('messageDeleteBulk', (messages) => {
      this.database.deleteMessage(messages.map((message) => message.id))
    })
  }

  public discordClient(): Client {
    return this.application.discordInstance.getClient()
  }

  private async autoRegisterGuilds(): Promise<void> {
    const instances = this.application.minecraftManager.getAllInstances()
    const allSavedGuilds = this.database.allGuilds()

    const tasks: Promise<void>[] = []
    for (const instance of instances) {
      const task = this.autoRegisterGuild(allSavedGuilds, instance).catch(
        this.errorHandler.promiseCatch('auto registering an in-game guild')
      )

      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async detectAllPlayers(): Promise<void> {
    const instances = this.application.minecraftManager.getAllInstances()
    const allSavedGuilds = this.database.allGuilds()

    const tasks: Promise<void>[] = []
    for (const instance of instances) {
      const task = this.detectPlayers(allSavedGuilds, instance).catch(
        this.errorHandler.promiseCatch('auto detecting in-game players')
      )

      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async detectPlayers(allSavedGuilds: MinecraftGuild[], instance: MinecraftInstance): Promise<void> {
    if (instance.currentStatus() !== Status.Connected) return

    const guildListResult = await this.application.core.guildManager
      .list(instance.instanceName, Duration.minutes(5))
      .catch(() => undefined)
    if (guildListResult === undefined) return

    const savedGuild = allSavedGuilds.find(
      (guild) => guild.name.toLowerCase().trim() === guildListResult.name.toLowerCase().trim()
    )
    if (savedGuild === undefined) return

    const waitlist = this.database.getWaitlist(savedGuild.id)
    const sentWaitlist = this.database.getSentWaitlist().filter((entry) => entry.guildId === savedGuild.id)
    if (waitlist.length === 0 && sentWaitlist.length === 0) return

    const uuids = await this.application.mojangApi
      .profilesByUsername(new Set(guildListResult.members.map((member) => member.username)))
      .then((response) =>
        response
          .values()
          .filter((uuid) => uuid !== undefined)
          .toArray()
      )

    let changed = false
    for (const uuid of uuids) {
      const databaseChange = await this.playerJoined(uuid, waitlist, sentWaitlist)
      if (databaseChange) changed = true
    }

    if (changed) {
      await this.waitlistInteraction.waitlistUpdated(savedGuild)
    }
  }

  private async playerJoined(
    uuid: string,
    waitlist: WaitlistEntry[],
    sentWaitlist: WaitlistRequestEntry[]
  ): Promise<boolean> {
    let changed = false
    const sentWaitlistEntry = sentWaitlist.find((entry) => entry.mojangId === uuid)
    if (sentWaitlistEntry !== undefined) {
      const client = this.discordClient()
      const channel = await client.channels.fetch(sentWaitlistEntry.channelId)
      if (channel?.isSendable()) {
        await channel
          .send({
            content: 'Congratulations. You have joined the guild. Have fun!',
            reply: { messageReference: sentWaitlistEntry.messageId, failIfNotExists: false }
          })
          .catch(this.errorHandler.promiseCatch('sending you joined the guild message in DM'))
      }

      this.database.removeSentWaitlist(sentWaitlistEntry.guildId, sentWaitlistEntry.mojangId)
      changed = true
    }

    const waitlistEntry = waitlist.find((entry) => entry.mojangId === uuid)
    if (waitlistEntry !== undefined) {
      this.database.removeWaitlist(waitlistEntry.guildId, waitlistEntry.mojangId)
      changed = true
    }

    return changed
  }

  private async autoRegisterGuild(allSavedGuilds: MinecraftGuild[], instance: MinecraftInstance): Promise<void> {
    if (instance.currentStatus() !== Status.Connected) return

    const guildListResult = await this.application.core.guildManager
      .list(instance.instanceName, Duration.minutes(5))
      .catch(() => undefined)
    if (guildListResult === undefined) return

    const savedGuild = allSavedGuilds.find(
      (guild) => guild.name.toLowerCase().trim() === guildListResult.name.toLowerCase().trim()
    )
    if (savedGuild !== undefined) return
    this.logger.info(`Auto registering an in-game guild for the instance ${instance.instanceName}`)

    const botUuid = instance.uuid()
    if (botUuid === undefined) {
      this.logger.error('Tried to auto register an in-game guild but can not find the bot UUID')
      return
    }
    const hypixelGuild = await this.application.hypixelApi.getGuildByPlayer(botUuid)
    if (hypixelGuild === undefined) return // probably the account left and guildListResult cache is outdated

    this.database.initGuild(
      hypixelGuild._id,
      hypixelGuild.name,
      hypixelGuild.ranks
        .filter((rank) => !rank.default)
        .map((rank) => ({ name: rank.name, priority: rank.priority, whitelisted: false }))
    )
  }

  private async handleJoinRequest(event: GuildPlayerEvent): Promise<void> {
    if (event.type !== GuildPlayerEventType.Request) return

    const instance = this.application.minecraftManager
      .getAllInstances()
      .find((instance) => instance.instanceName === event.instanceName)
    if (instance === undefined) return

    const savedGuild = await this.findSavedGuildFromInstance(instance)
    if (savedGuild === undefined) return
    if (!savedGuild.acceptJoinRequests) return

    const meetsCondition = await this.checkJoinRequirement(savedGuild, event.user)
    if (!meetsCondition) return

    await this.application.emit('broadcast', {
      ...this.eventHelper.fillBaseEvent(),

      channels: [ChannelType.Officer],
      color: Color.Good,

      user: event.user,
      message: `${event.user.displayName()} is auto-accepted into the guild for meeting the join requirements.`
    })
    await this.application.sendMinecraft(
      [event.instanceName],
      MinecraftSendChatPriority.High,
      event.eventId,
      `/guild accept ${event.user.mojangProfile().id}`
    )
  }

  private async findSavedGuildFromInstance(instance: MinecraftInstance): Promise<MinecraftGuild | undefined> {
    if (instance.currentStatus() !== Status.Connected) return
    const guildListResult = await this.application.core.guildManager.list(instance.instanceName)

    const allSavedGuilds = this.database.allGuilds()
    if (allSavedGuilds.length === 0) return

    let savedGuild = allSavedGuilds.find(
      (guild) => guild.name.toLowerCase().trim() === guildListResult.name.toLowerCase().trim()
    )
    if (savedGuild !== undefined) return savedGuild

    const botUuid = instance.uuid()
    if (botUuid === undefined) return

    const hypixelGuild = await this.application.hypixelApi.getGuildByPlayer(botUuid)
    if (hypixelGuild === undefined) return

    savedGuild = allSavedGuilds.find((guild) => guild.id === hypixelGuild._id)

    return savedGuild
  }

  private async checkJoinRequirement(savedGuild: MinecraftGuild, user: User): Promise<boolean> {
    const joinConditions = this.database.getJoinConditions(savedGuild.id)
    const conditionContext = {
      application: this.application,
      startTime: Date.now(),
      abortSignal: new AbortController().signal
    }
    const conditionUser = { user: user }
    let conditionsMet = 0
    for (const condition of joinConditions) {
      const handler = this.application.core.conditonsRegistry.get(condition.typeId)
      if (handler === undefined) continue

      const meetsCondition = await handler.meetsCondition(conditionContext, conditionUser, condition.options)
      if (meetsCondition) conditionsMet++
      if (conditionsMet >= savedGuild.neededJoinConditions) return true
    }

    return false
  }
}
