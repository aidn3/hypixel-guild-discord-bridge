import assert from 'node:assert'

import type { BaseMessageOptions, ButtonInteraction, ChatInputCommandInteraction, Client } from 'discord.js'
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
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import type { MojangProfile } from '../../common/user'
import { formatUser } from '../../instance/discord/common/commands-format'
import { DefaultCommandFooter } from '../../instance/discord/common/discord-config'
import { interactivePaging } from '../../instance/discord/utility/discord-pager'
import Duration from '../../utility/duration'

import type { Database, MinecraftGuild } from './database'
import type { MinecraftGuildsManager } from './minecraft-guilds-manager'

export class DiscordWaitlistInteraction extends SubInstance<MinecraftGuildsManager, InstanceType.Utility, Client> {
  public static readonly SignupId = 'signup'
  public static readonly ListId = 'list'

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
      }
    })
  }

  private async handleList(interaction: ButtonInteraction): Promise<void> {
    const panelConfiguration = this.database
      .getWaitlistPanels()
      .find((panel) => panel.messageId === interaction.message.id)
    if (panelConfiguration === undefined) return

    const savedGuild = this.database.allGuilds().find((savedEntry) => savedEntry.id === panelConfiguration.guildId)
    assert.ok(savedGuild !== undefined)

    assert.ok(interaction.inCachedGuild())
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await this.listWaitlist(interaction, savedGuild)
  }

  private async handleSignup(interaction: ButtonInteraction): Promise<void> {
    const panelConfiguration = this.database
      .getWaitlistPanels()
      .find((panel) => panel.messageId === interaction.message.id)
    if (panelConfiguration === undefined) return

    const savedGuild = this.database.allGuilds().find((savedEntry) => savedEntry.id === panelConfiguration.guildId)
    assert.ok(savedGuild !== undefined)

    assert.ok(interaction.inCachedGuild())
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const profile = this.application.discordInstance.profileByUser(interaction.user, interaction.member)
    const user = await this.application.core.initializeDiscordUser(profile, { guild: interaction.guild })
    const mojangProfile = user.mojangProfile()

    if (!mojangProfile) {
      // TODO: show a message explaining that the user isn't linked.
      //   add a button to start linking processing directly on the same flow.
      //   link-buttons-manager.ts might have some good functions to copy or to re-purpose.
      await interaction.editReply('You need to link first!')
      return
    }

    const alreadyRegistered = this.database
      .getWaitlist(savedGuild.id)
      .find((entry) => entry.mojangId === mojangProfile.id)
    if (alreadyRegistered) {
      await this.handleUnregisteringWaitlist(interaction, savedGuild, mojangProfile)
      return
    } else if (!savedGuild.selfWishlist) {
      await interaction.editReply({ content: 'Self-signup is disabled. Ask a staff member for help.' })
      return
    }

    const banned = user.punishments().longestPunishment(PunishmentType.Ban)
    if (banned !== undefined) {
      await interaction.editReply({
        content:
          `You are banned. Your ban expires <t:${Math.floor(banned.till / 1000)}:R>.` +
          `\n**Reason:** \`\`\`${escapeCodeBlock(banned.reason)}\`\`\``
      })
      return
    }

    const joinConditions = this.database.getJoinConditions(savedGuild.id)
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
      if (conditionsMet >= savedGuild.neededJoinConditions) break
    }
    if (joinConditions.length > 0 && conditionsMet < savedGuild.neededJoinConditions) {
      assert.strictEqual(joinConditions.length, joinConditions.length)
      const displayContext = { ...conditionContext, discordGuild: interaction.guild }
      let message = 'You do not meet the join requirement(s) to self-signup.'
      message += `\nYou need to meet at least ${inlineCode(savedGuild.neededJoinConditions.toString(10))} condition(s) of the following:`
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
      await interaction.editReply(message)
      return
    }

    const newlyRegistered = this.database.addWaitlist(savedGuild.id, mojangProfile.id)
    if (newlyRegistered) {
      await this.waitlistUpdated(savedGuild)

      await interaction.editReply(
        'You have been registered on this waitlist. Expect a DM message by this bot or a staff in the future to join!'
      )
      return
    } else {
      await this.handleUnregisteringWaitlist(interaction, savedGuild, mojangProfile)
    }
  }

  private async handleUnregisteringWaitlist(
    interaction: ButtonInteraction<'cached'>,
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
    await this.queue.add(async () => this.startWaitlistUpdate(savedGuild))
  }

  private async startWaitlistUpdate(savedGuild: MinecraftGuild): Promise<void> {
    const client = this.clientInstance.discordClient()
    const manager = this.database
    const panels = manager.getWaitlistPanels().filter((panel) => panel.guildId === savedGuild.id)
    if (panels.length === 0) return

    const view = await this.createView(savedGuild)
    const tasks = []
    for (const panel of panels) {
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
    const manager = this.database
    const panels = manager.getWaitlistPanels().filter((panel) => panel.guildId === savedGuild.id)
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
    interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    savedGuild: MinecraftGuild
  ): Promise<void> {
    await interactivePaging(interaction, 0, Duration.minutes(15).toMilliseconds(), this.errorHandler, async (page) => {
      const EntriesPerPage = 10
      const all = this.database.getWaitlist(savedGuild.id)
      const entries = all.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
      const totalPages = Math.ceil(all.length / EntriesPerPage)

      const result: string[] = []

      for (const entry of entries) {
        try {
          const mojangProfile = await this.application.mojangApi.profileByUuid(entry.mojangId)
          const user = await this.application.core.initializeMinecraftUser(mojangProfile, {
            guild: interaction.guild
          })
          result.push(`- ${formatUser(user)}: <t:${Math.floor(entry.createdAt)}>`)
        } catch {
          result.push(`- ${inlineCode(entry.mojangId)}: <t:${Math.floor(entry.createdAt)}>`)
        }
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

  public async createView(
    savedGuild: MinecraftGuild
  ): Promise<BaseMessageOptions & { flags: MessageFlags.IsComponentsV2 }> {
    const waitlist = this.database.getWaitlist(savedGuild.id)
    const chunk = waitlist.slice(0, 10)

    let message = `## Waitlist ${escapeMarkdown(savedGuild.name)}`
    message += `\n-# Last update: <t:${Math.floor(Date.now() / 1000)}:R>`

    for (const entry of chunk) {
      try {
        const mojangProfile = await this.application.mojangApi.profileByUuid(entry.mojangId)
        const user = await this.application.core.initializeMinecraftUser(mojangProfile, {})
        message += `\n- ${formatUser(user)}: <t:${Math.floor(entry.createdAt)}:d>`
      } catch {
        message += `\n- ${inlineCode(entry.mojangId)}: <t:${Math.floor(entry.createdAt)}:d>`
      }
    }

    const description = '-# You can **Signup** up in the waiting list to join the guild.'

    return {
      components: [
        {
          type: ComponentType.Container,
          components: [
            { type: ComponentType.TextDisplay, content: message },
            { type: ComponentType.Separator },
            { type: ComponentType.TextDisplay, content: description }
          ],
          accentColor: Color.Good
        },
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
      allowedMentions: { parse: [] },
      flags: MessageFlags.IsComponentsV2
    }
  }
}
