import assert from 'node:assert'

import type { ButtonInteraction, Client, CommandInteraction, ModalSubmitInteraction } from 'discord.js'
import { ComponentType, escapeMarkdown, MessageFlags, TextInputStyle } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { Color } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { HypixelApiFail, HypixelFailType } from '../../../core/hypixel/hypixel'
import type { HypixelPlayer } from '../../../core/hypixel/hypixel-player'
import Duration from '../../../utility/duration'
import { formatInvalidUsername } from '../common/commands-format'
import { DefaultCommandFooter } from '../common/discord-config'
import type { UpdateContext, UpdateProgress } from '../conditions/common'
import type DiscordInstance from '../discord-instance.js'

export default class LinkButtonsManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  public static readonly AutoLinkId = 'auto-link'

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    const client = this.clientInstance.getClient()
    client.on('interactionCreate', (interaction) => {
      if (!interaction.isButton() || !interaction.isMessageComponent()) return

      switch (interaction.customId) {
        case LinkButtonsManager.AutoLinkId: {
          void this.handleAutoLinkInteraction(interaction).catch(
            this.errorHandler.promiseCatch('handling linking button in a link panel.')
          )
        }
      }
    })
  }

  private async handleAutoLinkInteraction(interaction: ButtonInteraction): Promise<void> {
    const isLinkButton = this.application.core.discordLinkButton.getButton(interaction.message.id)
    if (!isLinkButton) return

    const startTime = Date.now()
    const linkedAlready = await this.application.core.verification.findByDiscord(interaction.user.id)
    if (linkedAlready === undefined) {
      await interaction.showModal({
        customId: interaction.id,
        title: 'Link Minecraft',
        components: [
          {
            type: ComponentType.Label,
            label: 'Username',
            description: 'In-game username to check.',
            // @ts-expect-error Discord API does not allow "label" repeated. "label" inside the component{} is removed
            component: {
              type: ComponentType.TextInput,
              style: TextInputStyle.Short,
              customId: 'username',
              minLength: 2,
              maxLength: 16,
              required: true,
              placeholder: 'Steve'
            }
          }
        ]
      })
      const modalData = await interaction.awaitModalSubmit({ time: Duration.minutes(15).toMilliseconds() })
      await modalData.deferReply({ flags: MessageFlags.Ephemeral })

      const username = modalData.fields.getTextInputValue('username')
      const linkResult = await this.tryLinking(modalData, startTime, username)
      if (!linkResult) return

      const syncResult = await this.forceSync(modalData, startTime)
      if (!syncResult) return

      await modalData.editReply('linked and synced!')
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const syncResult = await this.forceSync(interaction, startTime)
      if (!syncResult) return

      await interaction.editReply('linked and synced!')
    }
  }

  public async tryLinking(
    interaction: ButtonInteraction | CommandInteraction | ModalSubmitInteraction,
    startTime: number,
    username: string
  ): Promise<boolean> {
    const mojangProfile = await this.application.mojangApi.profileByUsername(username).catch(() => undefined)
    if (mojangProfile === undefined) {
      await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
      return false
    }

    let player: HypixelPlayer | undefined
    try {
      player = await this.application.hypixelApi.getPlayer(mojangProfile.id, startTime)
    } catch (error: unknown) {
      if (error instanceof HypixelApiFail && error.type === HypixelFailType.Throttle) {
        this.errorHandler.error('fetching Hypixel player data for /link', error)
        await interaction.editReply({
          embeds: [
            {
              title: 'Please try again in a moment',
              color: Color.Bad,
              description:
                'Too many requests are being made right now, so your information can’t be loaded at the moment.' +
                ' Please wait about 5 minutes and try again.',
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return false
      }

      throw error
    }
    if (player === undefined) {
      await interaction.editReply({
        embeds: [
          {
            title: 'Player never played on Hypixel before',
            color: Color.Bad,
            description: `Username \`${escapeMarkdown(username)}\` never played on Hypixel before?`,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return false
    }

    const discord = player.socialMedia?.links.DISCORD
    if (discord === undefined || discord !== interaction.user.username) {
      await interaction.editReply({
        embeds: [
          {
            title: 'Failed To Link',
            description:
              `Please update your in-game Hypixel socials for Discord from ` +
              (discord === undefined ? 'None' : `\`${escapeMarkdown(discord)}\``) +
              ` to \`${interaction.user.username}\``,
            color: Color.Bad,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return false
    }

    this.application.core.verification.addConfirmedLink(interaction.user.id, mojangProfile.id)
    return true
  }

  public async forceSync(
    interaction: ButtonInteraction | CommandInteraction | ModalSubmitInteraction,
    startTime: number
  ): Promise<boolean> {
    if (!interaction.inGuild()) {
      return false
    }
    assert.ok(interaction.inCachedGuild())

    const progress: UpdateProgress = {
      totalGuilds: 0,
      processedGuilds: 0,
      totalUsers: 0,
      processedUsers: 0,
      processedRoles: 0,
      processedNicknames: 0,
      errors: []
    }
    const updateContext = {
      application: this.application,
      updateReason: interaction.isChatInputCommand()
        ? `Manual sync via /${interaction.commandName} by ${interaction.user.username}`
        : `Manual sync via a button in message ${interaction.channelId}`,
      abortSignal: new AbortController().signal,
      startTime: startTime,
      progress: progress
    } satisfies UpdateContext

    const guildMember = await interaction.member.fetch()

    const user = await this.application.core.initializeDiscordUser(
      this.application.discordInstance.profileByUser(guildMember.user, guildMember),
      { guild: guildMember.guild }
    )

    await this.application.discordInstance.conditionsManager.updateMember(updateContext, { guildMember, user })
    return true
  }
}
