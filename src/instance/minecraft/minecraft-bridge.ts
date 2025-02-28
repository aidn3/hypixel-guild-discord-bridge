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
  InstanceStatusEvent,
  MinecraftChatEvent,
  MinecraftSendChat,
  ReconnectSignal
} from '../../common/application-event.js'
import {
  ChannelType,
  GuildPlayerEventType,
  InstanceType,
  MinecraftChatEventType
} from '../../common/application-event.js'
import Bridge from '../../common/bridge.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import { antiSpamString } from '../../util/shared-util.js'

import type MinecraftInstance from './minecraft-instance.js'

export default class MinecraftBridge extends Bridge<MinecraftInstance> {
  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, logger, errorHandler)

    this.application.on('reconnectSignal', (event) => {
      this.onReconnectSignal(event)
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

  onChat(event: ChatEvent): void | Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    const replyUsername = event.instanceType === InstanceType.Discord ? event.replyUsername : undefined

    if (event.channelType === ChannelType.Public) {
      void this.clientInstance
        .send(this.formatChatMessage('gc', event.username, replyUsername, event.message), event.eventId)
        .catch(this.errorHandler.promiseCatch('sending public chat message'))
    } else if (event.channelType === ChannelType.Officer) {
      void this.clientInstance
        .send(this.formatChatMessage('oc', event.username, replyUsername, event.message), event.eventId)
        .catch(this.errorHandler.promiseCatch('sending officer chat message'))
    }
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

  async onMinecraftChatEvent(event: MinecraftChatEvent): Promise<void> {
    if (event.type === MinecraftChatEventType.Block) return
    if (event.type === MinecraftChatEventType.Repeat) return
    await this.handleInGameEvent(event)
  }

  async handleInGameEvent(event: BaseInGameEvent<string>): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.clientInstance.send(`/gc @[${event.instanceName}]: ${event.message}`, event.eventId)
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(`/oc @[${event.instanceName}]: ${event.message}`, event.eventId)
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.clientInstance.send(`/gc @[${event.instanceName}]: ${event.message}`, event.eventId)
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(`/oc @[${event.instanceName}]: ${event.message}`, event.eventId)
  }

  onCommand(event: CommandEvent): void | Promise<void> {
    this.handleCommand(event, false)
  }

  onCommandFeedback(event: CommandFeedbackEvent): void | Promise<void> {
    this.handleCommand(event, true)
  }

  private onReconnectSignal(event: ReconnectSignal) {
    // undefined is strictly checked due to api specification
    if (event.targetInstanceName === undefined || event.targetInstanceName === this.clientInstance.instanceName) {
      this.logger.log('instance has received restart signal')
      void this.clientInstance
        .send(`/gc @Instance restarting...`, event.eventId)
        .then(() => {
          this.clientInstance.connect()
        })
        .catch(this.errorHandler.promiseCatch('handling restart broadcast and reconnecting'))
    }
  }

  private async onMinecraftSend(event: MinecraftSendChat): Promise<void> {
    // undefined is strictly checked due to api specification
    if (event.targetInstanceName === undefined || event.targetInstanceName === this.clientInstance.instanceName) {
      await this.clientInstance.send(event.command, event.eventId)
    }
  }

  private handleCommand(event: CommandFeedbackEvent, feedback: boolean) {
    if (
      event.instanceType === InstanceType.Minecraft &&
      event.instanceName === this.clientInstance.instanceName &&
      event.alreadyReplied
    ) {
      return
    }

    const finalResponse = `${feedback ? '{f} ' : ''}${event.commandResponse} @${antiSpamString()}`
    switch (event.channelType) {
      case ChannelType.Public: {
        void this.clientInstance
          .send(`/gc ${finalResponse}`, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling public command response display'))
        break
      }
      case ChannelType.Officer: {
        void this.clientInstance
          .send(`/oc ${finalResponse}`, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling private command response display'))
        break
      }
      case ChannelType.Private: {
        if (event.instanceType !== InstanceType.Minecraft || event.instanceName !== this.clientInstance.instanceName)
          return
        void this.clientInstance
          .send(`/msg ${event.username} ${finalResponse}`, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling private command response display'))
        break
      }
      default: {
        break
      }
    }
  }

  private formatChatMessage(
    prefix: string,
    username: string,
    replyUsername: string | undefined,
    message: string
  ): string {
    let full = `/${prefix} ${this.clientInstance.bridgePrefix}`

    full += username
    if (replyUsername != undefined) full += `⇾${replyUsername}`
    full += ': '
    full += message
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
      .trim()

    return full
  }
}
