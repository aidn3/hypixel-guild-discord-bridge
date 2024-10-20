import type Application from '../../application.js'
import type {
  BaseInGameEvent,
  ChatEvent,
  CommandEvent,
  CommandFeedbackEvent,
  GuildGeneralEvent,
  GuildPlayerEvent,
  InstanceStatusEvent,
  MinecraftChatEvent,
  MinecraftSendChat,
  BroadcastEvent,
  ReconnectSignal
} from '../../common/application-event.js'
import {
  ChannelType,
  GuildPlayerEventType,
  InstanceType,
  MinecraftChatEventType
} from '../../common/application-event.js'
import BridgeHandler from '../../common/bridge-handler.js'
import { antiSpamString } from '../../util/shared-util.js'

import type MinecraftInstance from './minecraft-instance.js'

export default class MinecraftBridgeHandler extends BridgeHandler<MinecraftInstance> {
  constructor(application: Application, clientInstance: MinecraftInstance) {
    super(application, clientInstance)

    this.application.on('reconnectSignal', (event) => {
      this.onReconnectSignal(event)
    })

    this.application.on('minecraftSend', (event) => {
      void this.onMinecraftSend(event)
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

    if (event.channelType === ChannelType.Public) {
      void this.clientInstance.send(this.formatChatMessage('gc', event.username, event.replyUsername, event.message))
    } else if (event.channelType === ChannelType.Officer) {
      void this.clientInstance.send(this.formatChatMessage('oc', event.username, event.replyUsername, event.message))
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
      await this.clientInstance.send(`/gc @[${event.instanceName}]: ${event.message}`)
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(`/oc @[${event.instanceName}]: ${event.message}`)
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.clientInstance.send(`/gc @[${event.instanceName}]: ${event.message}`)
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(`/oc @[${event.instanceName}]: ${event.message}`)
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
      this.clientInstance.logger.log('instance has received restart signal')
      void this.clientInstance.send(`/gc @Instance restarting...`).then(() => {
        this.clientInstance.connect()
      })
    }
  }

  private async onMinecraftSend(event: MinecraftSendChat): Promise<void> {
    // undefined is strictly checked due to api specification
    if (event.targetInstanceName === undefined || event.targetInstanceName === this.clientInstance.instanceName) {
      await this.clientInstance.send(event.command)
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
        void this.clientInstance.send(`/gc ${finalResponse}`)
        break
      }
      case ChannelType.Officer: {
        void this.clientInstance.send(`/oc ${finalResponse}`)
        break
      }
      case ChannelType.Private: {
        if (event.instanceType !== InstanceType.Minecraft || event.instanceName !== this.clientInstance.instanceName)
          return
        void this.clientInstance.send(`/msg ${event.username} ${finalResponse}`)
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
