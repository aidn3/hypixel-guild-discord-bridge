import assert from 'node:assert'

import type { Logger } from 'log4js'
import GetMinecraftData from 'minecraft-data'
import type { ChatMessage } from 'prismarine-chat'

import type Application from '../../application.js'
import type { InstanceType } from '../../common/application-event.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import AdvertiseChat from './chat/advertise.js'
import BlockChat from './chat/block.js'
import DemoteChat from './chat/demote.js'
import GuildKick from './chat/guild-kick'
import GuildMute from './chat/guild-mute'
import GuildMuted from './chat/guild-muted'
import GuildUnmute from './chat/guild-unmute'
import JoinChat from './chat/join.js'
import JoinedChat from './chat/joined'
import KickChat from './chat/kick.js'
import LeaveChat from './chat/leave.js'
import LevelChat from './chat/level'
import MuteChat from './chat/mute.js'
import MutedChat from './chat/muted.js'
import NoOfficerChat from './chat/no-officer.js'
import OfficerChat from './chat/officer.js'
import OfflineChat from './chat/offline.js'
import OnlineChat from './chat/online.js'
import PrivateChat from './chat/private.js'
import PromoteChat from './chat/promote.js'
import PublicChat from './chat/public.js'
import QuestChat from './chat/quest.js'
import RankGiftChat from './chat/rank-gift'
import RepeatChat from './chat/repeat.js'
import RequestChat from './chat/request.js'
import RequireGuildChat from './chat/require-guild.js'
import ThrottleDisabledChat from './chat/throttle-disabled'
import ThrottleEnabledChat from './chat/throttle-enabled'
import UnmuteChat from './chat/unmute.js'
import type ClientSession from './client-session.js'
import type { MinecraftChatMessage } from './common/chat-interface.js'
import type MessageAssociation from './common/message-association.js'
import { stufDecode } from './common/stuf.js'
import type MinecraftInstance from './minecraft-instance.js'

export default class ChatManager extends SubInstance<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private readonly chatModules: MinecraftChatMessage[]
  private readonly minecraftData

  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<InstanceType.Minecraft>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly messageAssociation: MessageAssociation
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.minecraftData = GetMinecraftData(clientInstance.defaultBotConfig.version)

    this.chatModules = [
      AdvertiseChat,
      BlockChat,
      DemoteChat,
      GuildKick,
      GuildMute,
      GuildMuted,
      GuildUnmute,
      JoinChat,
      JoinedChat,
      KickChat,
      LeaveChat,
      LevelChat,
      MuteChat,
      MutedChat,
      NoOfficerChat,
      OfficerChat,
      OfflineChat,
      OnlineChat,
      PrivateChat,
      PromoteChat,
      QuestChat,
      PublicChat,
      RankGiftChat,
      RepeatChat,
      RequestChat,
      RequireGuildChat,
      ThrottleDisabledChat,
      ThrottleEnabledChat,
      UnmuteChat
    ]
  }

  override registerEvents(clientSession: ClientSession): void {
    clientSession.client.on('systemChat', (data) => {
      const chatMessage = clientSession.prismChat.fromNotch(data.formattedMessage)
      void this.onMessage(
        chatMessage.toString(),
        chatMessage.toMotd(),
        this.normalizeJsonMessage(chatMessage.json)
      ).catch(this.errorHandler.promiseCatch('processing minecraft raw chat'))
    })

    clientSession.client.on('playerChat', (data: object) => {
      void this.onFormattedMessage(clientSession, data).catch(
        this.errorHandler.promiseCatch('processing minecraft raw chat')
      )
    })
  }

  private async onFormattedMessage(clientSession: ClientSession, data: object): Promise<void> {
    const message = (data as { formattedMessage?: string }).formattedMessage
    let resultMessage: ChatMessage & Partial<{ unsigned: ChatMessage }>
    let jsonMessage: unknown

    if (this.minecraftData.supportFeature('clientsideChatFormatting')) {
      const verifiedPacket = data as {
        senderName?: string
        targetName?: string
        plainMessage: string
        unsignedContent?: string
        type: number
      }
      const rawContent = message ?? verifiedPacket.unsignedContent
      const parameters: { content: object; sender?: object; target?: object } = {
        content: rawContent ? (JSON.parse(rawContent) as object) : { text: verifiedPacket.plainMessage }
      }
      jsonMessage = this.normalizeJsonMessage(parameters.content)

      if (verifiedPacket.senderName) {
        Object.assign(parameters, { sender: JSON.parse(verifiedPacket.senderName) as object })
      }
      if (verifiedPacket.targetName) {
        Object.assign(parameters, { target: JSON.parse(verifiedPacket.targetName) as object })
      }
      resultMessage = clientSession.prismChat.fromNetwork(verifiedPacket.type, parameters)

      if (verifiedPacket.unsignedContent) {
        resultMessage.unsigned = clientSession.prismChat.fromNetwork(verifiedPacket.type, {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sender: parameters.sender!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          target: parameters.target!,
          content: JSON.parse(verifiedPacket.unsignedContent) as object
        })
      }
    } else {
      assert.ok(message) // old packet means message exists
      resultMessage = clientSession.prismChat.fromNotch(message)
      jsonMessage = this.normalizeJsonMessage(resultMessage.json)
    }

    await this.onMessage(resultMessage.toString(), resultMessage.toMotd(), jsonMessage)
  }

  private normalizeJsonMessage(jsonMessage: unknown): unknown {
    if (Array.isArray(jsonMessage)) {
      return jsonMessage.map((entry: unknown) => this.normalizeJsonMessage(entry))
    }

    if (typeof jsonMessage !== 'object' || jsonMessage == undefined) {
      return jsonMessage
    }

    const normalized = Object.fromEntries(
      Object.entries(jsonMessage as Record<string, unknown>).map(
        ([key, value]: [string, unknown]): [string, unknown] => [key, this.normalizeJsonMessage(value)]
      )
    ) as Record<string, unknown>

    const clickEvent = normalized.click_event as
      | { action?: unknown; command?: unknown; value?: { command?: { value?: unknown } } }
      | undefined
    const clickCommand =
      typeof clickEvent?.command === 'string'
        ? clickEvent.command
        : typeof clickEvent?.value?.command?.value === 'string'
          ? clickEvent.value.command.value
          : undefined

    if (clickCommand && normalized.clickEvent == undefined) {
      normalized.clickEvent = {
        action: typeof clickEvent?.action === 'string' ? clickEvent.action : 'run_command',
        value: clickCommand
      }
    }

    return normalized
  }

  private async onMessage(message: string, rawMessage: string, jsonMessage: unknown): Promise<void> {
    message = stufDecode(message)

    for (const module of this.chatModules) {
      await Promise.resolve(
        module.onChat({
          application: this.application,

          clientInstance: this.clientInstance,
          instanceName: this.clientInstance.instanceName,
          eventHelper: this.eventHelper,

          logger: this.logger,
          errorHandler: this.errorHandler,
          messageAssociation: this.messageAssociation,

          message: message,
          rawMessage: rawMessage,
          jsonMessage: jsonMessage
        })
      ).catch(this.errorHandler.promiseCatch('handling chat trigger'))
    }

    await this.application.emit('minecraftChat', {
      ...this.eventHelper.fillBaseEvent(),
      message: message,
      rawMessage: rawMessage
    })
  }
}
