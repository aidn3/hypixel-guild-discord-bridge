import type { Client } from 'discord.js'
import { ButtonStyle, ComponentType, escapeMarkdown, inlineCode } from 'discord.js'
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
import { checkChatTriggers, InviteAcceptChat } from '../../utility/chat-triggers'
import Duration from '../../utility/duration'
import { setIntervalAsync } from '../../utility/scheduling'

import { discordGuildAutocomplete, DiscordGuildCommand, discordGuildCommandHandler } from './commands/discord-guild'
import Ranks from './commands/ranks'
import Rankup from './commands/rankup'
import type { MinecraftGuild, WaitlistEntry, WaitlistRequestEntry } from './database'
import { Database } from './database'
import { DiscordWaitlistInteraction } from './discord-waitlist-interaction'

export class MinecraftGuildsManager extends Instance<InstanceType.Utility> {
  private static readonly MaxGuildMembers = 125
  private static readonly WaitlistRequestDuration = Duration.days(1)

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

    this.application.on('guildPlayer', async (event) => {
      await this.detectionQueue.add(() => this.handleJoin(event))
    })

    setIntervalAsync(() => this.detectionQueue.add(() => this.autoRegisterGuilds()), {
      delay: Duration.minutes(1),
      errorHandler: this.errorHandler.promiseCatch('handling autoRegisterGuilds()')
    })
    setIntervalAsync(() => this.detectionQueue.add(() => this.detectAllPlayers()), {
      delay: Duration.minutes(5),
      errorHandler: this.errorHandler.promiseCatch('handling detectPlayers()')
    })
    setIntervalAsync(() => this.detectionQueue.add(() => this.processAllWaitlist()), {
      delay: Duration.minutes(15),
      errorHandler: this.errorHandler.promiseCatch('handling processWaitlist()')
    })
    setIntervalAsync(() => this.detectionQueue.add(() => this.processAllSentWaitlist()), {
      delay: Duration.minutes(5),
      errorHandler: this.errorHandler.promiseCatch('handling processAllSentWaitlist()')
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
    const sentWaitlist = this.database.getSentWaitlist(savedGuild.id)
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

      this.database.removeWaitlist(sentWaitlistEntry.guildId, sentWaitlistEntry.mojangId)
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

  private async handleJoin(event: GuildPlayerEvent): Promise<void> {
    if (event.type !== GuildPlayerEventType.Join) return

    const instance = this.application.minecraftManager
      .getAllInstances()
      .find((instance) => instance.instanceName === event.instanceName)
    if (instance === undefined) return

    const savedGuild = await this.findSavedGuildFromInstance(instance)
    if (savedGuild === undefined) return

    const waitlist = this.database.getWaitlist(savedGuild.id)
    const sentWaitlist = this.database.getSentWaitlist(savedGuild.id)
    const changed = await this.playerJoined(event.user.mojangProfile().id, waitlist, sentWaitlist)

    if (changed) {
      await this.waitlistInteraction.waitlistUpdated(savedGuild)
    }
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

  private async processAllWaitlist(): Promise<void> {
    const instances = this.application.minecraftManager.getAllInstances()
    const allSavedGuilds = this.database.allGuilds()

    const tasks: Promise<void>[] = []
    for (const instance of instances) {
      const task = this.processWaitlist(allSavedGuilds, instance).catch(
        this.errorHandler.promiseCatch('process in-game join waitlist')
      )

      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async processWaitlist(allSavedGuilds: MinecraftGuild[], instance: MinecraftInstance): Promise<void> {
    if (instance.currentStatus() !== Status.Connected) return

    const guildListResult = await this.application.core.guildManager
      .list(instance.instanceName, Duration.minutes(5))
      .catch(() => undefined)
    if (guildListResult === undefined) return
    let openSlots = MinecraftGuildsManager.MaxGuildMembers - guildListResult.members.length
    if (openSlots <= 0) return

    const savedGuild = allSavedGuilds.find(
      (guild) => guild.name.toLowerCase().trim() === guildListResult.name.toLowerCase().trim()
    )
    if (savedGuild === undefined) return
    const waitlist = this.database.getWaitlist(savedGuild.id)
    const sentWaitlist = this.database.getSentWaitlist(savedGuild.id)

    openSlots -= sentWaitlist.length
    if (openSlots <= 0) return

    const availablePlayers = waitlist.filter(
      (waitlistEntry) => !sentWaitlist.some((sentEntry) => sentEntry.mojangId === waitlistEntry.mojangId)
    )

    const usedSlots = 0
    for (const availablePlayer of availablePlayers) {
      const result = await this.sendJoinRequest(instance, savedGuild, availablePlayer.mojangId)
      if (result !== undefined) {
        await this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),
          user: undefined,
          color: Color.Info,
          channels: [ChannelType.Officer],
          message: result
        })
        break
      }

      if (usedSlots >= openSlots) break
    }
  }

  public async sendJoinRequest(
    instance: MinecraftInstance,
    savedGuild: MinecraftGuild,
    uuid: string
  ): Promise<string | undefined> {
    const profile = await this.application.mojangApi.profileByUuid(uuid)
    const minecraftSendResult = await checkChatTriggers(
      this.application,
      this.eventHelper,
      InviteAcceptChat,
      [instance.instanceName],
      `/guild invite ${profile.id}`,
      profile.name
    )
    if (minecraftSendResult.status !== 'success') {
      return (
        `Failed to invite ${profile.name} in-game: ` +
        minecraftSendResult.message.map((entry) => entry.content).join(' - ')
      )
    }

    const link = await this.application.core.verification.findByIngame(profile.id)
    if (link === undefined) {
      return `Invited ${profile.name} in-game but could not notify on Discord due to ${profile.name} DM disabled.`
    }

    try {
      const lastTimestamp = Date.now() - MinecraftGuildsManager.WaitlistRequestDuration.toMilliseconds()
      const discordClient = this.discordClient()
      const message = await discordClient.users.send(link.discordId, {
        content:
          `# ${savedGuild.name} join request approved` +
          `\nHey ${escapeMarkdown(profile.name)},` +
          `\nYou are invited to join Hypixel guild ${escapeMarkdown(savedGuild.name)}.` +
          `\nAn invite has been sent to you in-game on the account **${escapeMarkdown(profile.name)}** (${inlineCode(profile.id)}).` +
          `\nThe invite typically expires after 5 minutes. You can request another one by pressing the buttons down below any time as long as the offer stands.` +
          `\nYou have till <t:${Math.floor(lastTimestamp / 1000)}> to decide regarding this offer.` +
          `\n\nPress **Invite** to re-send the guild join invite in case you missed it.` +
          `\nPress **Reschedule** to be put back at the end of the waiting list if you can't decide yet.` +
          `\nPress **Decline** to decline the offer, so the next player on the waitlist receives it sooner.`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                customId: DiscordWaitlistInteraction.InviteId,
                label: 'Invite'
              },
              {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                customId: DiscordWaitlistInteraction.RescheduleId,
                label: 'Reschedule'
              },
              {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                customId: DiscordWaitlistInteraction.DeclineId,
                label: 'Decline'
              }
            ]
          }
        ]
      })

      this.database.addSentWaitlist({
        guildId: savedGuild.id,
        channelId: message.channelId,
        messageId: message.id,

        mojangId: profile.id,
        userId: link.discordId
      })
    } catch (error: unknown) {
      this.errorHandler.error('sending DM to invite player on waitlist', error)
      return `Invited ${profile.name} in-game but failed to notify ${profile.name} via Discord DM.`
    }
  }

  private async processAllSentWaitlist(): Promise<void> {
    const currentTime = Date.now()
    const allSavedGuilds = this.database.allGuilds()
    const sentWaitlist = allSavedGuilds
      .flatMap((guild) => this.database.getSentWaitlist(guild.id))
      .filter(
        (entry) => entry.createdAt + MinecraftGuildsManager.WaitlistRequestDuration.toMilliseconds() < currentTime
      )

    const tasks: Promise<void>[] = []
    for (const entry of sentWaitlist) {
      const task = this.processSentWaitlist(entry).catch(
        this.errorHandler.promiseCatch('process existing sent waitlist invites')
      )

      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async processSentWaitlist(entry: WaitlistRequestEntry): Promise<void> {
    const client = this.discordClient()
    const channel = await client.channels.fetch(entry.channelId)
    if (channel?.isSendable()) {
      await channel
        .send({
          content: 'You have missed the deadline to join the guild.',
          reply: { messageReference: entry.messageId, failIfNotExists: false }
        })
        .catch(this.errorHandler.promiseCatch('sending you missed the guild invitation deadline in DM'))
    }

    this.database.removeSentWaitlist(entry.guildId, entry.mojangId)
    this.database.removeWaitlist(entry.guildId, entry.mojangId)
  }
}
