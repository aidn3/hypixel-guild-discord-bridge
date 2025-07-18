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
  InstanceSignal,
  InstanceStatusEvent,
  MinecraftReactiveEvent,
  MinecraftReactiveEventType,
  MinecraftSendChat
} from '../../common/application-event.js'
import {
  ChannelType,
  GuildPlayerEventType,
  InstanceSignalType,
  InstanceType,
  MinecraftSendChatPriority
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

    this.application.on('instanceSignal', (event) => {
      this.onInstanceSignal(event)
    })

    this.application.on('minecraftSend', (event) => {
      void this.onMinecraftSend(event).catch(this.errorHandler.promiseCatch('handling incoming minecraftSend event'))
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onInstance(event: InstanceStatusEvent): void | Promise<void> {
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
      await this.formatChatMessage(prefix, event.username, replyUsername, event.message, event.instanceName),
      MinecraftSendChatPriority.Default,
      event.eventId
    ).catch(this.errorHandler.promiseCatch('sending chat message'))
  }

  async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    if (event.type === GuildPlayerEventType.Online || event.type === GuildPlayerEventType.Offline) return

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
        await this.send(
          `/gc @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        break
      }

      case ChannelType.Officer: {
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

  onCommand(event: CommandEvent): void | Promise<void> {
    this.handleCommand(event, false)
  }

  onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void> {
    this.handleCommand(event, true)
  }

  private onInstanceSignal(event: InstanceSignal) {
    if (event.targetInstanceName.includes(this.clientInstance.instanceName)) {
      this.logger.log(`instance has received signal type ${event.type}`)

      if (event.type === InstanceSignalType.Restart) {
        void this.send(`/gc @Instance restarting...`, MinecraftSendChatPriority.High, event.eventId).catch(
          this.errorHandler.promiseCatch('handling restart broadcast and reconnecting')
        )
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (event.type === InstanceSignalType.Shutdown) {
        void this.send(`/gc @Instance shutting down...`, MinecraftSendChatPriority.High, event.eventId).catch(
          this.errorHandler.promiseCatch('handling restart broadcast and reconnecting')
        )
      }
    }
  }

  private async onMinecraftSend(event: MinecraftSendChat): Promise<void> {
    if (event.targetInstanceName.includes(this.clientInstance.instanceName)) {
      await this.send(event.command, event.priority, event.eventId)
    }
  }

  private handleCommand(event: CommandEvent, feedback: boolean) {
    const reply = this.messageAssociation.getMessageId(event.originEventId)
    if (reply === undefined) {
      this.logger.error(
        `could not find the reply eventId for eventId ${event.eventId} with origin event id of ${event.originEventId}`
      )
      return
    }

    if (reply.channel === ChannelType.Private) assert.ok(reply.username === event.username)
    this.messageAssociation.addMessageId(event.eventId, reply)

    const finalResponse = `${feedback ? '{f} ' : ''}${event.commandResponse}`
    switch (reply.channel) {
      case ChannelType.Public: {
        void this.send(`/gc ${finalResponse}`, MinecraftSendChatPriority.Default, event.eventId).catch(
          this.errorHandler.promiseCatch('handling public command response display')
        )
        break
      }
      case ChannelType.Officer: {
        void this.send(`/oc ${finalResponse}`, MinecraftSendChatPriority.Default, event.eventId).catch(
          this.errorHandler.promiseCatch('handling private command response display')
        )
        break
      }
      case ChannelType.Private: {
        if (event.instanceType !== InstanceType.Minecraft || event.instanceName !== this.clientInstance.instanceName)
          return
        void this.send(
          `/msg ${event.username} ${finalResponse}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        ).catch(this.errorHandler.promiseCatch('handling private command response display'))
        break
      }
      default: {
        break
      }
    }
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
    instanceName: string
  ): Promise<string> {
    let full = `/${prefix} `

    if (this.application.generalConfig.data.originTag) {
      full += `[${instanceName}] `
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
