import type {
  ButtonInteraction,
  Message,
  MessageActionRowComponentData,
  MessageEditOptions,
  SendableChannels
} from 'discord.js'
import { ButtonStyle, ComponentType, escapeMarkdown, MessageFlags } from 'discord.js'

import type Application from '../../../application'
import type { InstanceStatus } from '../../../common/application-event'
import { Color, InstanceMessageType, Permission } from '../../../common/application-event'
import { Status } from '../../../common/connectable-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler'
import { DiscordInstanceHistoryButtonType } from '../../../core/discord/instance-history-button'
import {
  translateAuthenticationCodeExpired,
  translateInstanceMessage,
  translateInstanceStatus
} from '../../../core/instance/instance-language'
import { StatusHistoryEntryType } from '../../../core/instance/status-history'
import { beautifyInstanceName } from '../../../utility/shared-utility'
import type DiscordInstance from '../discord-instance'
import { DefaultTimeout, interactivePaging } from '../utility/discord-pager'

import { translateNoPermission } from './discord-language'
import type MessageAssociation from './message-association'

export class InstanceStatusManager {
  private static readonly PermissionToView = Permission.Helper
  private static readonly EntriesPerPage = 5
  private static readonly DetailsButtonId = 'show-instance-details'

  constructor(
    private readonly application: Application,
    private readonly clientInstance: DiscordInstance,
    private readonly messageAssociation: MessageAssociation,
    private readonly errorHandler: UnexpectedErrorHandler
  ) {
    this.clientInstance.getClient().on('interactionCreate', (interaction) => {
      if (!interaction.isButton() || !interaction.isMessageComponent()) return

      switch (interaction.customId) {
        case InstanceStatusManager.DetailsButtonId: {
          void this.handleDetailsButton(interaction).catch(
            this.errorHandler.promiseCatch('handling "show details" button in an instance status message.')
          )
        }
      }
    })
  }

  public async handleDetailsButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const entry = this.application.core.discordInstanceHistoryButton.getButton(interaction.message.id)
    if (entry === undefined) {
      await interaction.editReply('Message too old to find the history??')
      return
    }

    const identifier = this.clientInstance.profileByUser(
      interaction.user,
      interaction.inCachedGuild() ? interaction.member : undefined
    )
    const user = await this.application.core.initializeDiscordUser(identifier, {
      guild: interaction.guild ?? undefined
    })

    const permission = user.permission()
    if (permission < InstanceStatusManager.PermissionToView) {
      await interaction.editReply({
        content: translateNoPermission(this.application, InstanceStatusManager.PermissionToView),
        allowedMentions: { parse: [] }
      })
      return
    }

    await interactivePaging(interaction, 0, DefaultTimeout, this.errorHandler, (requestedPage) => {
      const entries = this.application.core.statusHistory
        .getHistory(entry.instanceName, entry.startTime, entry.endTime)
        .toReversed()

      // Only show latest authentication code since others have expired
      // and showing them might confuse user on which to use
      let firstAuthenticationIndex = -1
      // remove repeated authentication code requests
      // since they are spammy and need to regenerate every 15 minutes
      let authenticationFound = false
      for (let index = 0; index < entries.length; index++) {
        const currentEntry = entries[index]

        const currentIsAuthentication =
          currentEntry.entryType === StatusHistoryEntryType.Message &&
          currentEntry.type === InstanceMessageType.MinecraftAuthenticationCode

        if (currentIsAuthentication) {
          if (firstAuthenticationIndex === -1) firstAuthenticationIndex = index

          if (authenticationFound) {
            entries.splice(index, 1)
            index--
          } else {
            authenticationFound = true
          }
        } else {
          authenticationFound = false
        }
      }

      const start = requestedPage * InstanceStatusManager.EntriesPerPage
      const end = Math.min((requestedPage + 1) * InstanceStatusManager.EntriesPerPage, entries.length)

      let result = ''
      for (let index = start; index < end; index++) {
        const element = entries[index]
        result += `${index + 1}. <t:${Math.floor(element.createdAt / 1000)}> `

        switch (element.entryType) {
          case StatusHistoryEntryType.Message: {
            result += escapeMarkdown(translateInstanceMessage(this.application.i18n, element.type)) + '\n'
            if (element.value !== undefined) {
              // eslint-disable-next-line unicorn/prefer-ternary
              if (
                element.type === InstanceMessageType.MinecraftAuthenticationCode &&
                index !== firstAuthenticationIndex
              ) {
                result += escapeMarkdown(translateAuthenticationCodeExpired(this.application.i18n)) + '\n'
              } else {
                result += escapeMarkdown(element.value.trim()) + '\n'
              }
            }

            break
          }
          case StatusHistoryEntryType.Status: {
            result +=
              escapeMarkdown(
                translateInstanceStatus(this.application.i18n, { from: element.fromStatus, to: element.toStatus })
              ) + '\n'
            break
          }

          default: {
            throw new Error(`unknown type: ${JSON.stringify(element satisfies never)}`)
          }
        }
      }

      if (result.length === 0) {
        result = 'Nothing to show.'
      }

      return {
        embed: {
          title: `Status History for ${beautifyInstanceName(entry.instanceName)}`,
          description: result.trim()
        },
        totalPages: Math.ceil(entries.length / InstanceStatusManager.EntriesPerPage)
      }
    })
  }

  public async send(event: InstanceStatus): Promise<void> {
    const config = this.application.core.discordConfigurations
    const channels = new Set([
      ...config.getPublicChannelIds(),
      ...config.getOfficerChannelIds(),
      ...config.getLoggerChannelIds()
    ])

    for (const channelId of channels) {
      const channel = await this.clientInstance.getClient().channels.fetch(channelId)
      if (!channel?.isSendable()) continue

      const result = this.createMessage(event, channel.id)
      if (result === undefined) continue

      const message = await this.privateEditOrSend(
        event,
        result.payload,
        result.onlySend,
        result.status,
        channel,
        result.lastMessageId,
        result.replyMessageId
      )

      this.messageAssociation.addMessageId(event.eventId, {
        guildId: message.guildId ?? undefined,
        channelId: message.channelId,
        messageId: message.id
      })
    }
  }

  private async privateEditOrSend(
    event: InstanceStatus,
    payload: MessagePayload,
    onlySend: boolean,
    status: DiscordInstanceHistoryButtonType,
    channel: SendableChannels,
    editMessageId: string | undefined,
    replyMessageId: string | undefined
  ): Promise<Message> {
    if (editMessageId !== undefined) {
      try {
        let cachedMessage: Message | undefined = channel.messages.cache.get(editMessageId)
        cachedMessage ??= await channel.messages.fetch(editMessageId)

        // at this point of code, it is confirmed that the message exists already. So, update nothing.
        if (onlySend) {
          this.application.core.discordInstanceHistoryButton.extendButtonEndTimestamp(cachedMessage.id, event.createdAt)
          return cachedMessage
        }

        const message = await cachedMessage.edit(payload)
        this.application.core.discordInstanceHistoryButton.extendButtonEndTimestamp(cachedMessage.id, event.createdAt)
        return message
      } catch (error: unknown) {
        this.errorHandler.error('fetching last instance status message', error)
      }
    }

    let message: Message | undefined
    if (replyMessageId !== undefined) {
      const replyMessage = await channel.messages.fetch(replyMessageId).catch(() => undefined)

      if (replyMessage !== undefined) {
        message = await replyMessage.reply({ ...payload, allowedMentions: { parse: [] } })
      }
    }
    message ??= await channel.send({ ...payload, allowedMentions: { parse: [] } })

    this.application.core.discordInstanceHistoryButton.add({
      instanceName: event.instanceName,
      instanceType: event.instanceType,

      messageId: message.id,
      channelId: channel.id,

      type: status,
      startTime: event.createdAt,
      endTime: event.createdAt
    })

    return message
  }

  private getStatus(event: InstanceStatus): DiscordInstanceHistoryButtonType {
    if (event.status?.to === Status.Connected) return DiscordInstanceHistoryButtonType.Success
    else if (event.status?.to === Status.Failed) return DiscordInstanceHistoryButtonType.Failed
    else return DiscordInstanceHistoryButtonType.Notice
  }

  private createMessage(
    event: InstanceStatus,
    channelId: string
  ):
    | {
        payload: MessagePayload
        onlySend: boolean
        status: DiscordInstanceHistoryButtonType
        lastMessageId: string | undefined
        replyMessageId: string | undefined
      }
    | undefined {
    const lastMessage = this.application.core.discordInstanceHistoryButton.lastButton(channelId, event.instanceName)

    if (event.message === undefined && event.status.from === Status.Fresh) {
      if (lastMessage !== undefined) {
        this.application.core.discordInstanceHistoryButton.extendButtonEndTimestamp(
          lastMessage.messageId,
          event.createdAt
        )
      }
      return undefined
    }

    const currentStatus = this.getStatus(event)
    if (lastMessage === undefined) {
      if (event.status?.from === Status.Connected && currentStatus !== DiscordInstanceHistoryButtonType.Failed) {
        return {
          payload: this.generateInterrupted(event.instanceName),
          onlySend: false,
          status: currentStatus,
          lastMessageId: undefined,
          replyMessageId: undefined
        }
      } else if (event.status?.from === Status.Fresh && currentStatus !== DiscordInstanceHistoryButtonType.Failed) {
        return {
          payload: this.generateInitiation(event.instanceName),
          onlySend: false,
          status: currentStatus,
          lastMessageId: undefined,
          replyMessageId: undefined
        }
      }

      switch (currentStatus) {
        case DiscordInstanceHistoryButtonType.Failed: {
          return {
            payload: this.generateFailed(event.instanceName),
            onlySend: false,
            status: currentStatus,
            lastMessageId: undefined,
            replyMessageId: undefined
          }
        }
        case DiscordInstanceHistoryButtonType.Notice: {
          return {
            payload: this.generateNotice(event.instanceName),
            onlySend: false,
            status: currentStatus,
            lastMessageId: undefined,
            replyMessageId: undefined
          }
        }
        case DiscordInstanceHistoryButtonType.Success: {
          return {
            payload: this.generateSuccess(event.instanceName),
            onlySend: false,
            status: currentStatus,
            lastMessageId: undefined,
            replyMessageId: undefined
          }
        }
        default: {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`unknown status type: ${currentStatus satisfies never}`)
        }
      }
    }

    // Don't combine success status
    if (currentStatus === DiscordInstanceHistoryButtonType.Success) {
      return {
        payload: this.generateSuccess(event.instanceName),
        onlySend: false,
        status: currentStatus,
        lastMessageId: undefined,
        replyMessageId: lastMessage.messageId
      }

      // combine multiple authentication messages if all contain the same display message "this.generateAuthentication(...)"
    } else if (event.message?.type === InstanceMessageType.MinecraftAuthenticationCode) {
      const firstMessageEntry = this.application.core.statusHistory
        .getHistory(event.instanceName, lastMessage.startTime, lastMessage.endTime)
        .find((entry) => entry.entryType === StatusHistoryEntryType.Message)

      if (
        firstMessageEntry !== undefined &&
        firstMessageEntry.type === InstanceMessageType.MinecraftAuthenticationCode
      ) {
        return {
          payload: this.generateAuthentication(event.instanceName),
          onlySend: false,
          status: DiscordInstanceHistoryButtonType.Notice,
          lastMessageId: lastMessage.messageId,
          replyMessageId: undefined
        }
      }

      return {
        payload: this.generateAuthentication(event.instanceName),
        onlySend: true,
        status: DiscordInstanceHistoryButtonType.Notice,
        lastMessageId: undefined,
        replyMessageId: undefined
      }

      //combine notice/failed with previous failed
    } else if (lastMessage.type === DiscordInstanceHistoryButtonType.Failed) {
      switch (currentStatus) {
        case DiscordInstanceHistoryButtonType.Failed: {
          return {
            payload: this.generateFailed(event.instanceName),
            onlySend: true,
            status: currentStatus,
            lastMessageId: lastMessage.messageId,
            replyMessageId: undefined
          }
        }
        case DiscordInstanceHistoryButtonType.Notice: {
          return {
            payload: this.generateNotice(event.instanceName),
            onlySend: true,
            status: currentStatus,
            lastMessageId: lastMessage.messageId,
            replyMessageId: undefined
          }
        }
        default: {
          currentStatus satisfies never
        }
      }
    } else if (event.status?.from === Status.Fresh && currentStatus !== DiscordInstanceHistoryButtonType.Failed) {
      return {
        payload: this.generateInitiation(event.instanceName),
        onlySend: false,
        status: currentStatus,
        lastMessageId: lastMessage.messageId,
        replyMessageId: undefined
      }
    } else if (
      lastMessage.type === DiscordInstanceHistoryButtonType.Notice &&
      currentStatus === DiscordInstanceHistoryButtonType.Notice
    ) {
      return {
        payload: this.generateNotice(event.instanceName),
        onlySend: true,
        status: currentStatus,
        lastMessageId: lastMessage.messageId,
        replyMessageId: undefined
      }
    } else if (event.status?.from === Status.Connected && currentStatus === DiscordInstanceHistoryButtonType.Notice) {
      return {
        payload: this.generateInterrupted(event.instanceName),
        onlySend: false,
        status: currentStatus,
        lastMessageId: undefined,
        replyMessageId: undefined
      }
    } else if (
      lastMessage.type === DiscordInstanceHistoryButtonType.Notice &&
      currentStatus === DiscordInstanceHistoryButtonType.Failed
    ) {
      return {
        payload: this.generateFailed(event.instanceName),
        onlySend: false,
        status: currentStatus,
        lastMessageId: lastMessage.messageId,
        replyMessageId: undefined
      }
    } else {
      switch (currentStatus) {
        case DiscordInstanceHistoryButtonType.Failed: {
          return {
            payload: this.generateFailed(event.instanceName),
            onlySend: false,
            status: currentStatus,
            lastMessageId: undefined,
            replyMessageId: undefined
          }
        }
        case DiscordInstanceHistoryButtonType.Notice: {
          return {
            payload: this.generateNotice(event.instanceName),
            onlySend: false,
            status: currentStatus,
            lastMessageId: undefined,
            replyMessageId: undefined
          }
        }
        default: {
          currentStatus satisfies never
        }
      }
    }
  }

  private generateNotice(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.chat-notice'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Info
        }
      ],
      components: [{ type: ComponentType.ActionRow, components: this.generateButtons() }]
    }
  }

  private generateAuthentication(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.requires-authentication'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Info
        }
      ],
      components: [{ type: ComponentType.ActionRow, components: this.generateButtons() }]
    }
  }
  private generateInitiation(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.instance-started'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Info
        }
      ],
      components: [{ type: ComponentType.ActionRow, components: this.generateButtons() }]
    }
  }

  private generateFailed(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.chat-failed'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Bad
        }
      ],
      components: [{ type: ComponentType.ActionRow, components: this.generateButtons() }]
    }
  }

  private generateSuccess(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.chat-resumed'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Good
        }
      ]
    }
  }

  private generateInterrupted(instanceName: string): MessagePayload {
    return {
      embeds: [
        {
          description: this.application.i18n.t(($) => $['discord.status.chat-interrupted'], {
            instanceName: beautifyInstanceName(instanceName)
          }),
          color: Color.Info
        }
      ],
      components: [{ type: ComponentType.ActionRow, components: this.generateButtons() }]
    }
  }

  private generateButtons(): MessageActionRowComponentData[] {
    return [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        customId: InstanceStatusManager.DetailsButtonId,
        label: 'Show Details',
        emoji: { name: '📑' }
      }
    ]
  }
}

type MessagePayload = Pick<MessageEditOptions, 'embeds' | 'components'>
