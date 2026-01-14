import assert from 'node:assert'

import type { Logger } from 'log4js'

import type Application from '../../application.js'
import type {
  BaseInGameEvent,
  BroadcastEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatus,
  MinecraftReactiveEvent
} from '../../common/application-event.js'
import {
  ChannelType,
  ContentType,
  GuildPlayerEventType,
  InstanceType,
  MinecraftReactiveEventType,
  MinecraftSendChatPriority,
  PunishmentPurpose,
  PunishmentType
} from '../../common/application-event.js'
import Bridge from '../../common/bridge.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import type MessageAssociation from './common/message-association.js'
import type MinecraftInstance from './minecraft-instance.js'

export default class MinecraftBridge extends Bridge<MinecraftInstance> {
  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly messageAssociation: MessageAssociation
  ) {
    super(application, clientInstance, logger, errorHandler)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onInstance(event: InstanceStatus): void | Promise<void> {
    // TODO: implement onInstance on minecraft side
    // maybe not implement either if it gives better UX
    return undefined
  }

  async onChat(event: ChatEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    if (event.channelType === ChannelType.Private) return

    const replyUsername = event.instanceType === InstanceType.Discord ? event.replyUsername : undefined
    const prefix = event.channelType === ChannelType.Public ? 'gc' : 'oc'

    this.messageAssociation.addMessageId(event.eventId, { channel: event.channelType })

    await this.send(
      await this.formatChatMessage(
        prefix,
        event.user.displayName(),
        replyUsername,
        event.message,
        event.instanceName,
        event.instanceType
      ),
      MinecraftSendChatPriority.Default,
      event.eventId
    ).catch(this.errorHandler.promiseCatch('sending chat message'))
  }

  async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    if (event.type === GuildPlayerEventType.Online || event.type === GuildPlayerEventType.Offline) return

    if (event.type === GuildPlayerEventType.Mute && event.user !== undefined) {
      const game =
        event.user
          .punishments()
          .all()
          .filter((punishment) => punishment.type === PunishmentType.Mute)
          .toSorted((a, b) => b.createdAt - a.createdAt)
          .at(0)?.purpose === PunishmentPurpose.Game

      if (game) return
    }

    await this.handleInGameEvent(event)
  }

  async onGuildGeneral(event: GuildGeneralEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return

    await this.handleInGameEvent(event)
  }

  private readonly lastMinecraftEvent = new Map<MinecraftReactiveEventType, Map<ChannelType, number>>()

  async onMinecraftChatEvent(event: MinecraftReactiveEvent): Promise<void> {
    const reply = this.messageAssociation.getMessageId(event.originEventId)
    if (reply === undefined) return

    let map = this.lastMinecraftEvent.get(event.type)
    if (map === undefined) {
      map = new Map<ChannelType, number>()
      this.lastMinecraftEvent.set(event.type, map)
    }

    if ((map.get(reply.channel) ?? 0) + 5000 > Date.now()) return
    map.set(reply.channel, Date.now())

    this.messageAssociation.addMessageId(event.eventId, reply)
    switch (reply.channel) {
      case ChannelType.Public: {
        if (
          event.type === MinecraftReactiveEventType.RequireGuild &&
          event.instanceName === this.clientInstance.instanceName
        ) {
          return
        }

        await this.send(
          `/gc @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        break
      }

      case ChannelType.Officer: {
        if (
          event.type === MinecraftReactiveEventType.RequireGuild &&
          event.instanceName === this.clientInstance.instanceName
        ) {
          return
        }

        await this.send(
          `/oc @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        break
      }
      case ChannelType.Private: {
        await this.send(
          `/msg ${reply.username} @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
      }
    }
  }

  async handleInGameEvent(event: BaseInGameEvent<string>): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.send(
        `/gc @[${event.instanceName}]: ${event.message}`,
        MinecraftSendChatPriority.Default,
        event.eventId
      )
    else if (event.channels.includes(ChannelType.Officer))
      await this.send(
        `/oc @[${event.instanceName}]: ${event.message}`,
        MinecraftSendChatPriority.Default,
        event.eventId
      )
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    const message = await this.application.minecraftManager.sanitizer.sanitizeChatMessage(
      this.clientInstance.instanceName,
      event.message
    )
    if (event.channels.includes(ChannelType.Public))
      await this.send(`/gc ${message}`, MinecraftSendChatPriority.Default, event.eventId)
    if (event.channels.includes(ChannelType.Officer))
      await this.send(`/oc ${message}`, MinecraftSendChatPriority.Default, event.eventId)
  }

  async onCommand(event: CommandEvent): Promise<void> {
    await this.handleCommand(event, false)
  }

  async onCommandFeedback(event: CommandFeedbackEvent): Promise<void> {
    await this.handleCommand(event, true)
  }

  private async handleCommand(event: CommandEvent, feedback: boolean) {
    const reply = this.messageAssociation.getMessageId(event.originEventId)
    if (reply === undefined) {
      this.logger.error(
        `could not find the reply eventId for eventId ${event.eventId} with origin event id of ${event.originEventId}`
      )
      return
    }

    if (reply.channel === ChannelType.Private) assert.ok(reply.username === event.user.displayName())
    this.messageAssociation.addMessageId(event.eventId, reply)

    let response = feedback ? '{f} ' : ''
    switch (event.commandResponse.type) {
      case ContentType.TextBased: {
        response += event.commandResponse.content
        break
      }
      case ContentType.ImageBased: {
        response += event.commandResponse.unsupported
        break
      }
    }

    const sanitizedResponse = await this.application.minecraftManager.sanitizer.sanitizeChatMessage(
      this.clientInstance.instanceName,
      response
    )
    let prefix = ''
    switch (reply.channel) {
      case ChannelType.Public: {
        prefix = '/gc'
        break
      }
      case ChannelType.Officer: {
        prefix = '/oc'
        break
      }
      case ChannelType.Private: {
        if (event.instanceType !== InstanceType.Minecraft || event.instanceName !== this.clientInstance.instanceName)
          return
        prefix = `/msg ${event.user.mojangProfile().name}`
        break
      }
      default: {
        reply satisfies never
        break
      }
    }

    await this.send(`${prefix} ${sanitizedResponse}`, MinecraftSendChatPriority.Default, event.eventId)
  }

  private async send(message: string, priority: MinecraftSendChatPriority, eventId: string | undefined): Promise<void> {
    const newMessage = this.application.minecraftManager.sanitizer.sanitizeGenericCommand(message)
    await this.clientInstance.send(newMessage, priority, eventId)
  }

  private async formatChatMessage(
    prefix: string,
    username: string,
    replyUsername: string | undefined,
    message: string,
    instanceName: string,
    instanceType: InstanceType
  ): Promise<string> {
    let full = `/${prefix} `

    if (this.application.core.applicationConfigurations.getOriginTag()) {
      full += instanceType === InstanceType.Discord ? `[DC] ` : `[${instanceName}] `
    }

    full += username
    if (replyUsername != undefined) full += `⇾${replyUsername}`
    full += ': '

    full += await this.application.minecraftManager.sanitizer.sanitizeChatMessage(
      this.clientInstance.instanceName,
      message
    )

    return full
  }
}
