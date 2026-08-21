import assert from 'node:assert'

import type { ButtonInteraction } from 'discord.js'
import { MessageFlags } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../application.js'
import { Permission } from '../../common/application-event.js'
import { Status } from '../../common/connectable-instance.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { DiscordAnonymousUser } from '../../common/user.js'
import { formatChatTriggerResponse } from '../../instance/discord/common/chattrigger-format.js'
import { DefaultCommandFooter } from '../../instance/discord/common/discord-config.js'
import { translateNoPermission } from '../../instance/discord/common/discord-language.js'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance.js'
import { checkChatTriggers, InviteAcceptChat } from '../../utility/chat-triggers.js'

import type { ButtonDatabase, DiscordPersistentInstance } from './button-database.js'
import { DiscordInstanceHistoryButtonType } from './button-database.js'
import type { MinecraftActionButtons } from './minecraft-action-buttons.js'

export class ActionsInteraction extends SubInstance<MinecraftActionButtons, void> {
  constructor(
    application: Application,
    instance: MinecraftActionButtons,
    eventHelper: EventHelper<MinecraftActionButtons>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal,
    private readonly database: ButtonDatabase
  ) {
    super(application, instance, eventHelper, logger, errorHandler, abortSignal)

    const client = this.application.discordInstance.getClient()
    client.on('interactionCreate', (interaction) => {
      if (!interaction.isButton()) return
      this.buttonInteraction(interaction).catch(
        this.errorHandler.promiseCatch(`handling a button interaction ${interaction.message.id}`)
      )
    })
  }

  private async buttonInteraction(interaction: ButtonInteraction): Promise<void> {
    const entry = this.database.getButton(interaction.message.id)
    if (entry === undefined) return

    switch (entry.type) {
      case DiscordInstanceHistoryButtonType.InvitedToGuild: {
        await this.invitedToGuild(interaction, entry)
        break
      }
    }
  }

  private async invitedToGuild(interaction: ButtonInteraction, entry: DiscordPersistentInstance): Promise<void> {
    const user = await this.getUser(interaction)
    const userPermission = await user.permission()
    if (userPermission < Permission.Helper) {
      await interaction.reply({
        content: translateNoPermission(this.application, Permission.Helper),
        flags: MessageFlags.Ephemeral
      })

      return
    }

    const instance = this.findInstance(entry.botUuid)
    if (instance === undefined) {
      await this.replyNoInstance(interaction)
      return
    }

    const username = instance.username()
    assert.ok(username !== undefined)

    await interaction.deferReply()
    const result = await checkChatTriggers(this.application, InviteAcceptChat, [instance], entry.command, username)
    const formatted = formatChatTriggerResponse(result, `Accept Guild Join Invite`)

    await interaction.editReply({ embeds: [formatted] })
  }

  private async requestToJoinGuild(interaction: ButtonInteraction, entry: DiscordPersistentInstance): Promise<void> {
    const user = await this.getUser(interaction)
    const userPermission = await user.permission()
    if (userPermission < Permission.Helper) {
      await interaction.reply({
        content: translateNoPermission(this.application, Permission.Helper),
        flags: MessageFlags.Ephemeral
      })

      return
    }

    const instance = this.findInstance(entry.botUuid)
    if (instance === undefined) {
      await this.replyNoInstance(interaction)
      return
    }

    const username = instance.username()
    assert.ok(username !== undefined)

    await interaction.deferReply()

    assert.ok(entry.userUuid)
    const mojangProfile = await this.application.mojangApi.profileByUuid(entry.userUuid)

    const result = await checkChatTriggers(
      this.application,
      InviteAcceptChat,
      [instance],
      entry.command,
      mojangProfile.name
    )
    const formatted = formatChatTriggerResponse(result, `Request To Join Guild`)

    await interaction.editReply({ embeds: [formatted] })
  }

  private findInstance(botUuid: string): MinecraftInstance | undefined {
    return this.application.minecraftManager
      .getAllInstances()
      .find((instance) => instance.currentStatus() === Status.Connected && instance.uuid() === botUuid)
  }

  private async replyNoInstance(event: ButtonInteraction): Promise<void> {
    await event.reply({
      embeds: [
        {
          description: `Target Minecraft instance is not online for this action.`,
          footer: { text: DefaultCommandFooter }
        }
      ],
      flags: MessageFlags.Ephemeral
    })
  }

  private async getUser(interaction: ButtonInteraction): Promise<DiscordAnonymousUser> {
    const identifier = this.application.discordInstance.profileByUser(interaction.user, interaction.member ?? undefined)
    return await this.application.core.initializeDiscordUser(identifier)
  }
}
