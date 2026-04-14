import assert from 'node:assert'

import type {
  APIEmbed,
  APIEmbedField,
  BaseMessageOptions,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ModalSubmitInteraction
} from 'discord.js'
import {
  ButtonStyle,
  ComponentType,
  escapeCodeBlock,
  escapeInlineCode,
  escapeMarkdown,
  inlineCode,
  MessageFlags,
  Routes
} from 'discord.js'
import type { Logger } from 'log4js'
import type PromiseQueue from 'promise-queue'

import type Application from '../../application'
import { Color, type InstanceType, PunishmentType } from '../../common/application-event'
import { Status } from '../../common/connectable-instance'
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import type { MojangProfile } from '../../common/user'
import { formatChatTriggerResponse } from '../../instance/discord/common/chattrigger-format'
import { formatUser } from '../../instance/discord/common/commands-format'
import { DefaultCommandFooter } from '../../instance/discord/common/discord-config'
import LinkButtonsManager from '../../instance/discord/features/link-buttons-manager'
import { interactivePaging } from '../../instance/discord/utility/discord-pager'
import { showModal } from '../../instance/discord/utility/modal-options'
import type { PresetListOption } from '../../instance/discord/utility/options-handler'
import { OptionType } from '../../instance/discord/utility/options-handler'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance'
import { checkChatTriggers, InviteAcceptChat } from '../../utility/chat-triggers'
import Duration from '../../utility/duration'

import type { Database, MinecraftGuild, WaitlistPanel } from './database'
import type { MinecraftGuildsManager } from './minecraft-guilds-manager'

export class DiscordWaitlistInteraction extends SubInstance<MinecraftGuildsManager, InstanceType.Utility, Client> {
  public static readonly SignupId = 'signup'
  public static readonly ListId = 'list'

  public static readonly InviteId = 'invite'
  public static readonly RescheduleId = 'reschedule'
  public static readonly DeclineId = 'decline'

  private static readonly WaitlistRescheduleGracePeriod = Duration.days(1)

  constructor(
    application: Application,
    clientInstance: MinecraftGuildsManager,
    eventHelper: EventHelper<InstanceType.Utility>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly database: Database,
    private readonly queue: PromiseQueue
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    const client = this.clientInstance.discordClient()
    client.on('interactionCreate', (interaction) => {
      if (!interaction.isButton()) return

      switch (interaction.customId) {
        case DiscordWaitlistInteraction.SignupId: {
          void this.handleSignup(interaction).catch(
            this.errorHandler.promiseCatch(`handling waitlist signup button: ${interaction.message.id}`)
          )
          break
        }

        case DiscordWaitlistInteraction.ListId: {
          void this.handleList(interaction).catch(
            this.errorHandler.promiseCatch(`handling waitlist listing button: ${interaction.message.id}`)
          )
          break
        }

        case DiscordWaitlistInteraction.InviteId: {
          void this.handleInvite(interaction).catch(
            this.errorHandler.promiseCatch(`handling waitlist invite button: ${interaction.message.id}`)
          )
          break
        }
        case DiscordWaitlistInteraction.DeclineId: {
          void this.handleDecline(interaction).catch(
            this.errorHandler.promiseCatch(`handling waitlist decline button: ${interaction.message.id}`)
          )
          break
        }
        case DiscordWaitlistInteraction.RescheduleId: {
          void this.handleReschedule(interaction).catch(
            this.errorHandler.promiseCatch(`handling waitlist decline button: ${interaction.message.id}`)
          )
          break
        }
      }
    })
  }

  private async handleList(interaction: ButtonInteraction): Promise<void> {
    const panelConfiguration = this.database
      .getWaitlistPanels()
      .find((panel) => panel.messageId === interaction.message.id)
    if (panelConfiguration === undefined) return

    const guildResult = await this.selectGuild(panelConfiguration, interaction)
    if (typeof guildResult === 'string') {
      await interaction.reply(guildResult)
      return
    }
    const responseInteraction = guildResult.response
    const selectedGuild = guildResult.guild

    assert.ok(responseInteraction.inCachedGuild())
    await responseInteraction.deferReply({ flags: MessageFlags.Ephemeral })
    await this.listWaitlist(responseInteraction, selectedGuild)
  }

  private async selectGuild(
    panel: WaitlistPanel,
    interaction: ButtonInteraction
  ): Promise<{ guild: MinecraftGuild; response: ModalSubmitInteraction | ButtonInteraction } | string> {
    const savedGuilds = this.database.allGuilds().filter((guild) => panel.guildIds.includes(guild.id))

    if (savedGuilds.length === 0) {
      return `Expired signup button. Nothing can be done here.`
    } else if (savedGuilds.length === 1) {
      return { guild: savedGuilds[0], response: interaction }
    } else {
      const option: Omit<PresetListOption, 'getOption' | 'setOption'> & { key: string } = {
        type: OptionType.PresetList,
        key: 'guildIds',
        name: 'Selected Guild',
        description: 'Which guild to signup for its waitlist',
        max: 1,
        min: 1,
        options: savedGuilds.map((guild) => ({ label: guild.name, value: guild.id }))
      }
      const result = await showModal(interaction, 'Join Waitlist Signup', [option], Duration.minutes(10))
      const guilds = result.result.guildIds as string[]
      const foundGuild = savedGuilds.find((savedGuild) => guilds.includes(savedGuild.id))
      assert.ok(foundGuild !== undefined)
      return { guild: foundGuild, response: result.modalResponse }
    }
  }

  private async handleSignup(interaction: ButtonInteraction): Promise<void> {
    const panelConfiguration = this.database
      .getWaitlistPanels()
      .find((panel) => panel.messageId === interaction.message.id)
    if (panelConfiguration === undefined) return

    const guildResult = await this.selectGuild(panelConfiguration, interaction)
    if (typeof guildResult === 'string') {
      await interaction.reply(guildResult)
      return
    }
    const responseInteraction: ButtonInteraction | ModalSubmitInteraction = guildResult.response
    const selectedGuild = guildResult.guild

    await responseInteraction.deferReply({ flags: MessageFlags.Ephemeral })
    const linkedAlready = await this.application.core.verification.findByDiscord(interaction.user.id)
    if (linkedAlready !== undefined) {
      await this.continueSigningUp(guildResult.response, selectedGuild)
      return
    }

    const message = await responseInteraction.editReply({
      content: 'You need to link before proceeding here.',
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: ButtonStyle.Primary,
              customId: LinkButtonsManager.AutoLinkId,
              label: 'Link'
            }
          ]
        }
      ]
    })
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: Duration.minutes(15).toMilliseconds()
    })

    let stopLinking = false
    collector.on('collect', (newInteraction) => {
      if (stopLinking) return

      stopLinking = true
      void this.application.discordInstance.linkButtons
        .showLinkingWizard(newInteraction, Date.now(), true)
        .then(async (result) => {
          if (result === undefined) {
            stopLinking = false
          } else {
            collector.stop()
            await this.continueSigningUp(result.modal, selectedGuild)
          }
        })
        .catch((error: unknown) => {
          stopLinking = false
          this.errorHandler.error('trying to link before signing up', error)
        })
    })
  }

  private async continueSigningUp(
    responseInteraction: ButtonInteraction | ModalSubmitInteraction,
    selectedGuild: MinecraftGuild
  ): Promise<void> {
    assert.ok(responseInteraction.inCachedGuild())

    const profile = this.application.discordInstance.profileByUser(responseInteraction.user, responseInteraction.member)
    const user = await this.application.core.initializeDiscordUser(profile, { guild: responseInteraction.guild })
    const mojangProfile = user.mojangProfile()

    if (!mojangProfile) {
      await responseInteraction.editReply('You need to link first!')
      return
    }

    const guild = await this.application.hypixelApi.getGuildByPlayer(mojangProfile.id)
    if (guild?._id === selectedGuild.id) {
      await responseInteraction.editReply({ content: 'You are already in this guild!' })
      return
    }

    const alreadyRegistered = this.database
      .getWaitlistStatus(selectedGuild.id)
      .find((entry) => entry.mojangId === mojangProfile.id)
    if (alreadyRegistered) {
      await this.handleUnregisteringWaitlist(responseInteraction, selectedGuild, mojangProfile)
      return
    } else if (!selectedGuild.selfWishlist) {
      await responseInteraction.editReply({ content: 'Self-signup is disabled. Ask a staff member for help.' })
      return
    }

    const banned = user.activePunishments().longestPunishment(PunishmentType.Ban)
    if (banned !== undefined) {
      await responseInteraction.editReply({
        content:
          `You are banned. Your ban expires <t:${Math.floor(banned.till / 1000)}:R>.` +
          `\n**Reason:** \`\`\`${escapeCodeBlock(banned.reason)}\`\`\``
      })
      return
    }

    const joinConditions = this.database.getJoinConditions(selectedGuild.id)
    const conditionsManager = this.application.core.conditonsRegistry
    const conditionContext = {
      application: this.application,
      startTime: Date.now(),
      abortSignal: new AbortController().signal
    }
    const conditionUser = { user: user }
    let conditionsMet = 0
    const conditionsMetList: boolean[] = []
    for (const condition of joinConditions) {
      const handler = conditionsManager.get(condition.typeId)
      if (handler === undefined) {
        conditionsMetList.push(false)
        continue
      }
      const meetsCondition = await handler.meetsCondition(conditionContext, conditionUser, condition.options)

      if (meetsCondition) {
        conditionsMetList.push(true)
        conditionsMet++
      }
      if (conditionsMet >= selectedGuild.neededJoinConditions) break
    }
    if (joinConditions.length > 0 && conditionsMet < selectedGuild.neededJoinConditions) {
      assert.strictEqual(joinConditions.length, joinConditions.length)
      const displayContext = { ...conditionContext, discordGuild: responseInteraction.guild }
      let message = 'You do not meet the join requirement(s) to self-signup.'
      message += `\nYou need to meet at least ${inlineCode(selectedGuild.neededJoinConditions.toString(10))} condition(s) of the following:`
      for (const [index, condition] of joinConditions.entries()) {
        const meetsCondition = conditionsMetList[index]
        const handler = conditionsManager.get(condition.typeId)

        message += '\n- '
        message += meetsCondition ? '✅' : '❌'
        message += ` `

        if (handler === undefined) {
          message += `${inlineCode(escapeInlineCode(condition.typeId))}: ${inlineCode(JSON.stringify(condition.options))}`
        } else {
          const display = await handler.displayCondition(displayContext, condition.options)
          message += escapeMarkdown(display)
        }
      }
      await responseInteraction.editReply(message)
      return
    }

    const newlyRegistered = this.database.addWaitlist(selectedGuild.id, mojangProfile.id)
    if (newlyRegistered) {
      await this.waitlistUpdated(selectedGuild)

      await responseInteraction.editReply(
        'You have been registered on this waitlist. Expect a DM message by this bot or a staff in the future to join!'
      )
      return
    } else {
      await this.handleUnregisteringWaitlist(responseInteraction, selectedGuild, mojangProfile)
    }
  }

  private async handleInvite(interaction: ButtonInteraction): Promise<void> {
    const sentWaitlist = this.database.getWaitlistByMessageId(interaction.message.id)
    if (sentWaitlist === undefined) return

    const savedGuild = this.database.allGuilds().find((savedEntry) => savedEntry.id === sentWaitlist.guildId)
    assert.ok(savedGuild !== undefined)

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const profile = await this.application.mojangApi.profileByUuid(sentWaitlist.mojangId)

    let instance: MinecraftInstance | undefined = undefined
    for (const potentialInstance of this.application.minecraftManager.getAllInstances()) {
      if (potentialInstance.currentStatus() !== Status.Connected) continue

      const guildListResult = await this.application.core.guildManager
        .list(potentialInstance.instanceName, Duration.minutes(5))
        .catch(() => undefined)
      if (guildListResult === undefined) continue

      if (guildListResult.name.trim().toLowerCase() === savedGuild.name.trim().toLowerCase()) {
        instance = potentialInstance
        break
      }
    }

    if (instance === undefined) {
      await interaction.editReply('Can not process this request right now due to inability to connect to Hypixel')
      return
    }

    const command = `/g invite ${profile.name}`

    const result = await checkChatTriggers(
      this.application,
      this.eventHelper,
      InviteAcceptChat,
      [instance.instanceName],
      command,
      profile.name
    )
    const formatted = formatChatTriggerResponse(result, `Invite ${escapeMarkdown(profile.name)}`)

    await interaction.editReply({ embeds: [formatted] })
  }

  private async handleDecline(interaction: ButtonInteraction): Promise<void> {
    const sentWaitlist = this.database.getWaitlistByMessageId(interaction.message.id)
    if (sentWaitlist === undefined) return

    const savedGuild = this.database.allGuilds().find((savedEntry) => savedEntry.id === sentWaitlist.guildId)
    assert.ok(savedGuild !== undefined)

    await interaction.deferReply()

    await this.queue.add(async () => {
      this.database.removeWaitlist(sentWaitlist.guildId, sentWaitlist.mojangId)
      await this.unsafeWaitlistUpdated(savedGuild)
    })

    await interaction.channel?.messages
      .edit(interaction.message.id, { components: [this.clientInstance.discordInviteButtons(true)] })
      .catch(this.errorHandler.promiseCatch('disabling actions buttons of the guild invite'))

    await interaction.editReply('You have successfully declined the offer. Thank you for your speedy response!')
  }

  private async handleReschedule(interaction: ButtonInteraction): Promise<void> {
    const waitlistEntry = this.database.getWaitlistByMessageId(interaction.message.id)
    if (waitlistEntry === undefined) return

    const savedGuild = this.database.allGuilds().find((savedEntry) => savedEntry.id === waitlistEntry.guildId)
    assert.ok(savedGuild !== undefined)

    await interaction.deferReply()

    const newTime = Date.now() + DiscordWaitlistInteraction.WaitlistRescheduleGracePeriod.toMilliseconds()
    const rescheduled = await this.queue.add(async () => {
      const result = this.database.rescheduleWaitlist(waitlistEntry.id, newTime)
      if (result) await this.unsafeWaitlistUpdated(savedGuild)
      return result
    })

    await interaction.channel?.messages
      .edit(interaction.message.id, { components: [this.clientInstance.discordInviteButtons(true)] })
      .catch(this.errorHandler.promiseCatch('disabling actions buttons of the guild invite'))

    if (rescheduled) {
      await interaction.editReply(
        'You have successfully rescheduled yourself back into the waiting list.' +
          `You will not receive any further offers till <t:${Math.floor(newTime / 1000)}>.` +
          '\nHope you will accept the offer next time!'
      )
      return
    }

    await interaction.editReply('Could not find the offer. Maybe the offer already expired?')
  }

  private async handleUnregisteringWaitlist(
    interaction: ButtonInteraction<'cached'> | ModalSubmitInteraction<'cached'>,
    savedGuild: MinecraftGuild,
    mojangProfile: MojangProfile
  ): Promise<void> {
    const message = await interaction.editReply({
      embeds: [
        {
          description:
            `You are already registered on this waitlist. Expect a DM message by this bot or staff in the future to join!` +
            '\nIn case you wish to remove yourself from this list, press the button below.',
          color: Color.Info,
          footer: { text: DefaultCommandFooter }
        }
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [{ type: ComponentType.Button, customId: 'remove', label: 'REMOVE', style: ButtonStyle.Danger }]
        }
      ]
    })

    let response: ButtonInteraction | undefined = undefined

    try {
      response = await message.awaitMessageComponent({
        time: Duration.minutes(1).toMilliseconds(),
        componentType: ComponentType.Button,
        filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id
      })
    } catch {
      // timed out
      await message.edit({ components: [] })
      return
    }

    if (response.customId !== 'remove') assert.fail(`unknown customId: ${response.customId}`)

    await response.deferReply({ flags: MessageFlags.Ephemeral })

    this.database.removeWaitlist(savedGuild.id, mojangProfile.id)
    await this.waitlistUpdated(savedGuild)

    await response.editReply({
      content: 'You have been removed from this waitlist.'
    })
    return
  }

  public async waitlistUpdated(savedGuild: MinecraftGuild): Promise<void> {
    await this.queue.add(async () => this.unsafeWaitlistUpdated(savedGuild))
  }

  public async unsafeWaitlistUpdated(savedGuild: MinecraftGuild): Promise<void> {
    const client = this.clientInstance.discordClient()
    const manager = this.database
    const guilds = manager.allGuilds()
    const panels = manager.getWaitlistPanels().filter((panel) => panel.guildIds.includes(savedGuild.id))
    if (panels.length === 0) return

    const cache = new Map<MinecraftGuild['id'], APIEmbedField>()
    const tasks = []
    for (const panel of panels) {
      const relatedGuilds = guilds.filter((guild) => panel.guildIds.includes(guild.id))
      const view = await this.createViewWithCache(cache, relatedGuilds)
      const channel = await client.channels.fetch(panel.channelId)
      if (!channel) {
        this.logger.warn(
          'found a guild waitlist panel but its Discord residing channel is unresolvable. Deleting the panel.'
        )
        manager.deleteMessage([panel.messageId])
        return
      }
      if (!channel.isSendable()) {
        this.logger.warn(
          'found a guild waitlist panel but its Discord residing channel can not receive messages. Deleting the panel.'
        )
        manager.deleteMessage([panel.messageId])
        return
      }

      const task = channel.messages
        .edit(panel.messageId, view)
        .catch(
          this.errorHandler.promiseCatch(
            `updating waitlist panel channel=${panel.channelId},message=${panel.messageId}`
          )
        )
      tasks.push(task)
    }

    await Promise.allSettled(tasks)
  }

  public async notifyBeforeGuildUnregister(savedGuild: MinecraftGuild): Promise<void> {
    await this.queue.add(async () => this.startNotifyGuildUnregister(savedGuild))
  }

  private async startNotifyGuildUnregister(savedGuild: MinecraftGuild): Promise<void> {
    const client = this.clientInstance.discordClient()
    const panels = this.database
      .getWaitlistPanels()
      .filter((panel) => panel.guildIds.length === 1 && panel.guildIds[0] === savedGuild.id)
    if (panels.length === 0) return

    const tasks = []
    for (const panel of panels) {
      const channelId = panel.channelId
      const messageId = panel.messageId

      const task = client.rest
        .delete(Routes.channelMessage(channelId, messageId))
        .catch(this.errorHandler.promiseCatch(`deleting temporarily event channel=${channelId},message=${messageId}`))
      tasks.push(task)
    }

    await Promise.allSettled(tasks)
  }

  public async listWaitlist(
    interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'> | ModalSubmitInteraction<'cached'>,
    savedGuild: MinecraftGuild
  ): Promise<void> {
    await interactivePaging(interaction, 0, Duration.minutes(15).toMilliseconds(), this.errorHandler, async (page) => {
      const EntriesPerPage = 10
      const all = this.database.getWaitlistStatus(savedGuild.id)
      const entries = all.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
      const totalPages = Math.max(Math.ceil(all.length / EntriesPerPage), 1)

      const result: string[] = []

      for (const entry of entries) {
        let formattedEntry = '- '
        try {
          const mojangProfile = await this.application.mojangApi.profileByUuid(entry.mojangId)
          const user = await this.application.core.initializeMinecraftUser(mojangProfile, {
            guild: interaction.guild
          })
          formattedEntry += formatUser(user)
        } catch {
          formattedEntry += inlineCode(entry.mojangId)
        }

        formattedEntry += `: <t:${Math.floor(entry.createdAt / 1000)}>`
        if (entry.invitedTill > 0) formattedEntry += ` [invited]`
        else if (entry.noInviteTill > 0) formattedEntry += ` [rescheduled]`
        result.push(formattedEntry)
      }

      return {
        totalPages: totalPages,
        embed: {
          title: `${savedGuild.name} Waitlist (Page ${page + 1} out of ${totalPages})`,
          description: result.length === 0 ? '_Nothing to show._' : result.join('\n'),
          footer: { text: DefaultCommandFooter }
        }
      }
    })
  }

  public async createView(savedGuilds: MinecraftGuild[]): Promise<BaseMessageOptions> {
    return this.createViewWithCache(new Map(), savedGuilds)
  }

  private async createViewWithCache(
    cache: Map<MinecraftGuild['id'], APIEmbedField>,
    savedGuilds: MinecraftGuild[]
  ): Promise<BaseMessageOptions> {
    const embed = {
      title: 'Guild Join Waitlist',
      description:
        `-# Last update: <t:${Math.floor(Date.now() / 1000)}:R>` +
        '\n-# You can **Signup** up in the waiting list to join the guild.' +
        '\n-# When it is your turn, you will receive a DM with 24 hours time to join the guild.',
      fields: [] as APIEmbedField[],
      color: Color.Good
    } satisfies APIEmbed

    for (const savedGuild of savedGuilds) {
      const cached = cache.get(savedGuild.id)
      if (cached) {
        embed.fields.push(cached)
      } else {
        const field = await this.createDescription(savedGuild)
        cache.set(savedGuild.id, field)
        embed.fields.push(field)
      }
    }

    return {
      embeds: [embed],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: ButtonStyle.Success,
              customId: DiscordWaitlistInteraction.SignupId,
              emoji: '✍️',
              label: 'Signup'
            },
            {
              type: ComponentType.Button,
              style: ButtonStyle.Primary,
              customId: DiscordWaitlistInteraction.ListId,
              emoji: '📄',
              label: 'List'
            }
          ]
        }
      ],
      allowedMentions: { parse: [] }
    }
  }

  private async createDescription(savedGuild: MinecraftGuild): Promise<APIEmbedField> {
    const waitlist = this.database.getWaitlistStatus(savedGuild.id)
    const chunk = waitlist.slice(0, 10)

    const title = `${escapeMarkdown(savedGuild.name)} (${waitlist.length} users)`
    let message = ''
    if (waitlist.length === 0) {
      message = 'No users here.'
    } else {
      for (const entry of chunk) {
        message += '\n - '
        try {
          const mojangProfile = await this.application.mojangApi.profileByUuid(entry.mojangId)
          const user = await this.application.core.initializeMinecraftUser(mojangProfile, {})
          message += formatUser(user)
        } catch {
          message += inlineCode(entry.mojangId)
        }

        message += `: <t:${Math.floor(entry.createdAt / 1000)}:d>`
        if (entry.invitedTill > 0) message += ` [invited]`
        else if (entry.noInviteTill > 0) message += ` [rescheduled]`
      }
    }

    return { name: title, value: message.trim(), inline: true }
  }
}
