import assert from 'node:assert'

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
import type { GuildFetch } from '../../core/users/guild-manager'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance'
import { checkChatTriggers, InviteAcceptChat } from '../../utility/chat-triggers'
import Duration from '../../utility/duration'
import { setIntervalAsync } from '../../utility/scheduling'

import { discordGuildAutocomplete, DiscordGuildCommand, discordGuildCommandHandler } from './commands/discord-guild'
import Ranks from './commands/ranks'
import Rankup from './commands/rankup'
import type { MinecraftGuild, WaitlistEntry } from './database'
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
    setIntervalAsync(() => this.detectionQueue.add(() => this.processAllWaitlist()), {
      delay: Duration.minutes(5),
      errorHandler: this.errorHandler.promiseCatch('handling processWaitlist()')
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

  private async detectPlayers(
    guildListResult: Readonly<GuildFetch>,
    waitlist: WaitlistEntry[]
  ): Promise<Set<WaitlistEntry>> {
    const clearedWaitlist = new Set<WaitlistEntry>()
    if (waitlist.length === 0) return clearedWaitlist

    const uuids = await this.application.mojangApi
      .profilesByUsername(new Set(guildListResult.members.map((member) => member.username)))
      .then((response) => response.values().filter((uuid) => uuid !== undefined))
    for (const uuid of uuids) {
      const waitlistEntry = waitlist.find((entry) => entry.mojangId === uuid)
      if (waitlistEntry === undefined) continue

      await this.playerJoined(waitlistEntry)
      clearedWaitlist.add(waitlistEntry)
    }

    return clearedWaitlist
  }

  private async playerJoined(waitlistEntry: WaitlistEntry): Promise<boolean> {
    if (waitlistEntry.discord !== undefined) {
      const client = this.discordClient()
      const channel = await client.channels.fetch(waitlistEntry.discord.channelId)
      if (channel?.isSendable()) {
        await channel
          .send({
            content: 'Congratulations. You have joined the guild. Have fun!',
            reply: { messageReference: waitlistEntry.discord.messageId, failIfNotExists: false }
          })
          .catch(this.errorHandler.promiseCatch('sending you joined the guild message in DM'))
      }
    }

    return this.database.removeWaitlist(waitlistEntry.guildId, waitlistEntry.mojangId)
  }

  private async handleJoin(event: GuildPlayerEvent): Promise<void> {
    if (event.type !== GuildPlayerEventType.Join) return

    const instance = this.application.minecraftManager
      .getAllInstances()
      .find((instance) => instance.instanceName === event.instanceName)
    if (instance === undefined) return

    const savedGuild = await this.findSavedGuildFromInstance(instance)
    if (savedGuild === undefined) return

    const waitlist = this.database.getWaitlistStatus(savedGuild.id)
    const uuid = event.user.mojangProfile().id
    const entry = waitlist.find((entry) => entry.mojangId === uuid)
    if (entry === undefined) return

    const changed = await this.playerJoined(entry)

    if (changed) {
      await this.waitlistInteraction.unsafeWaitlistUpdated(savedGuild)
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
    const currentTime = Date.now()
    let changed = false
    let openSlots = MinecraftGuildsManager.MaxGuildMembers

    const guildListResult = await this.application.core.guildManager
      .list(instance.instanceName, Duration.minutes(1))
      .catch(() => undefined)
    if (guildListResult === undefined) return
    openSlots -= guildListResult.members.length

    const savedGuild = allSavedGuilds.find(
      (guild) => guild.name.toLowerCase().trim() === guildListResult.name.toLowerCase().trim()
    )
    if (savedGuild === undefined) return

    const waitlist = this.database.getWaitlistStatus(savedGuild.id)

    const alreadyJoined = await this.detectPlayers(guildListResult, waitlist)
    if (alreadyJoined.size > 0) changed = true
    for (const joinedEntry of alreadyJoined) {
      const index = waitlist.indexOf(joinedEntry)
      assert.notStrictEqual(index, -1)
      waitlist.splice(index, 1)
    }

    const invites = waitlist.filter((entry) => entry.invitedTill > 0)
    const expiredInvites = invites.filter((entry) => entry.invitedTill < currentTime)
    if (expiredInvites.length > 0) changed = true
    await this.processExpiredInvites(expiredInvites)

    openSlots -= invites.length
    openSlots += expiredInvites.length

    const usedSlots = 0
    for (const waitEntry of waitlist) {
      if (usedSlots >= openSlots) break
      if (waitEntry.noInviteTill < currentTime) continue
      if (waitEntry.invitedTill !== 0) continue

      const result = await this.sendJoinRequest(instance, savedGuild, waitEntry)
      if (result !== undefined) {
        await this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),
          user: undefined,
          color: Color.Info,
          channels: [ChannelType.Officer],
          message: result
        })
      }
    }

    if (changed) {
      await this.waitlistInteraction.unsafeWaitlistUpdated(savedGuild)
    }
  }

  public async sendJoinRequest(
    instance: MinecraftInstance,
    savedGuild: MinecraftGuild,
    waitlistEntry: WaitlistEntry
  ): Promise<string | undefined> {
    const profile = await this.application.mojangApi.profileByUuid(waitlistEntry.mojangId)
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

    const setAsInvited = this.database.waitlistSetInvited(waitlistEntry.id)
    if (!setAsInvited) {
      this.logger.warn(
        `Trying to set invited flag on a waitlist but it does not exist in the database? ${JSON.stringify(waitlistEntry)}`
      )
    }

    const link = await this.application.core.verification.findByIngame(profile.id)
    if (link === undefined) {
      return `Invited ${profile.name} in-game but could not notify on Discord due to ${profile.name} DM disabled.`
    }

    try {
      const lastTimestamp = Date.now() + MinecraftGuildsManager.WaitlistRequestDuration.toMilliseconds()
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
        reference: waitlistEntry.id,

        messageId: message.id,
        channelId: message.channelId
      })
    } catch (error: unknown) {
      this.errorHandler.error('sending DM to invite player on waitlist', error)
      return `Invited ${profile.name} in-game but failed to notify ${profile.name} via Discord DM.`
    }
  }

  private async processExpiredInvites(expiredInvites: WaitlistEntry[]): Promise<void> {
    const tasks: Promise<void>[] = []
    for (const expiredInvite of expiredInvites) {
      const task = this.processExpiredInvite(expiredInvite)
      tasks.push(task)
    }

    await Promise.all(tasks)
  }

  private async processExpiredInvite(entry: WaitlistEntry): Promise<void> {
    const discordReference = entry.discord
    if (discordReference !== undefined) {
      const client = this.discordClient()
      const channel = await client.channels.fetch(discordReference.channelId)

      if (channel?.isSendable()) {
        await channel
          .send({
            content: 'You have missed the deadline to join the guild.',
            reply: { messageReference: discordReference.messageId, failIfNotExists: false }
          })
          .catch(this.errorHandler.promiseCatch('sending you missed the guild invitation deadline in DM'))
      }
    }

    const deleted = this.database.removeWaitlist(entry.guildId, entry.mojangId)
    if (!deleted) {
      this.logger.warn(
        `Processed an expired waitlist invite but it does not exist in the database? ${JSON.stringify(entry)}`
      )
    }
  }
}
