import assert from 'node:assert'

import EmojisMap from 'emoji-name-map'
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
import { antiSpamString } from '../../util/shared-util.js'

import ArabicFixer from './common/arabic-fixer.js'
import type MessageAssociation from './common/message-association.js'
import { stufEncode } from './common/stuf.js'
import type MinecraftInstance from './minecraft-instance.js'

export default class MinecraftBridge extends Bridge<MinecraftInstance> {
  private readonly arabicFixer = new ArabicFixer()

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

  onChat(event: ChatEvent): void | Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return
    const replyUsername = event.instanceType === InstanceType.Discord ? event.replyUsername : undefined

    if (event.channelType === ChannelType.Public) {
      this.messageAssociation.addMessageId(event.eventId, { channel: event.channelType })
      void this.clientInstance
        .send(
          this.formatChatMessage('gc', event.username, replyUsername, event.message),
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        .catch(this.errorHandler.promiseCatch('sending public chat message'))
    } else if (event.channelType === ChannelType.Officer) {
      this.messageAssociation.addMessageId(event.eventId, { channel: event.channelType })
      void this.clientInstance
        .send(
          this.formatChatMessage('oc', event.username, replyUsername, event.message),
          MinecraftSendChatPriority.Default,
          event.eventId
        )
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
        await this.clientInstance.send(
          `/gc @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        break
      }

      case ChannelType.Officer: {
        await this.clientInstance.send(
          `/oc @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
        break
      }
      case ChannelType.Private: {
        await this.clientInstance.send(
          `/msg ${reply.username} @[${event.instanceName}]: ${event.message}`,
          MinecraftSendChatPriority.Default,
          event.eventId
        )
      }
    }
  }

  async handleInGameEvent(event: BaseInGameEvent<string>): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.clientInstance.send(
        `/gc @[${event.instanceName}]: ${event.message}`,
        MinecraftSendChatPriority.Default,
        event.eventId
      )
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(
        `/oc @[${event.instanceName}]: ${event.message}`,
        MinecraftSendChatPriority.Default,
        event.eventId
      )
  }

  async onBroadcast(event: BroadcastEvent): Promise<void> {
    if (event.channels.includes(ChannelType.Public))
      await this.clientInstance.send(`/gc ${event.message}`, MinecraftSendChatPriority.Default, event.eventId)
    else if (event.channels.includes(ChannelType.Officer))
      await this.clientInstance.send(`/oc ${event.message}`, MinecraftSendChatPriority.Default, event.eventId)
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
        void this.clientInstance
          .send(`/gc @Instance restarting...`, MinecraftSendChatPriority.High, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling restart broadcast and reconnecting'))
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (event.type === InstanceSignalType.Shutdown) {
        void this.clientInstance
          .send(`/gc @Instance shutting down...`, MinecraftSendChatPriority.High, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling restart broadcast and reconnecting'))
      }
    }
  }

  private async onMinecraftSend(event: MinecraftSendChat): Promise<void> {
    // undefined is strictly checked due to api specification
    if (event.targetInstanceName.includes(this.clientInstance.instanceName)) {
      await this.clientInstance.send(event.command, event.priority, event.eventId)
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

    if (reply.channel === ChannelType.Private) assert(reply.username === event.username)
    this.messageAssociation.addMessageId(event.eventId, reply)

    const finalResponse = `${feedback ? '{f} ' : ''}${event.commandResponse} @${antiSpamString()}`
    switch (reply.channel) {
      case ChannelType.Public: {
        void this.clientInstance
          .send(`/gc ${finalResponse}`, MinecraftSendChatPriority.Default, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling public command response display'))
        break
      }
      case ChannelType.Officer: {
        void this.clientInstance
          .send(`/oc ${finalResponse}`, MinecraftSendChatPriority.Default, event.eventId)
          .catch(this.errorHandler.promiseCatch('handling private command response display'))
        break
      }
      case ChannelType.Private: {
        if (event.instanceType !== InstanceType.Minecraft || event.instanceName !== this.clientInstance.instanceName)
          return
        void this.clientInstance
          .send(`/msg ${event.username} ${finalResponse}`, MinecraftSendChatPriority.Default, event.eventId)
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
    let full = `/${prefix} `

    full += username
    if (replyUsername != undefined) full += `⇾${replyUsername}`
    full += ': '

    message = this.encodeMessage(message)
    full += message
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
      .trim()

    return full
  }

  private encodeMessage(message: string): string {
    message = this.application.minecraftManager.getConfig().data.stuf
      ? stufEncode(message)
      : message
          .split(' ')
          .map((part) => {
            try {
              if (part.startsWith('https:') || part.startsWith('http')) return '(link)'
            } catch {
              /* ignored */
            }
            return part
          })
          .join(' ')

    message = this.arabicFixer.encode(message)
    message = this.substituteEmoji(message)
    message = this.cleanStandardEmoji(message)

    return message
  }

  private substituteEmoji(message: string): string {
    const map = new Map<string, string[]>()
    map.set('❤', '❤️ 💟 ♥️ 🖤 💙 🤎 💝 💚 🩶 🩵 🧡 🩷 💜 💖 🤍 💛 💓 💗 💕'.split(' '))
    map.set('❣', '❣️'.split(' '))
    map.set('☠', '💀 ☠️'.split(' '))

    for (const [substitute, convertEmojis] of map) {
      for (const convertEmoji of convertEmojis) {
        message = message.replaceAll(convertEmoji, substitute)
      }
    }

    return message
  }

  private cleanStandardEmoji(message: string): string {
    const AllowedString =
      '☺ ☹ ☠ ❣ ❤ ✌ ☝ ✍ ♨ ✈ ⌛ ⌚ ☀ ☁ ☂ ❄ ☃ ☄ ♠ ♥ ♦ ♣ ♟ ☎ ⌨ ✉ ✏ ✒ ✂ ☢ ☣ ' +
      '⬆ ⬇ ➡ ⬅ ↗ ↘ ↙ ↖ ↕ ↔ ↩ ↪ ✡ ☸ ☯ ✝ ☦ ☪ ☮ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ▶ ◀ ♀ ♂ ✖ ‼ 〰 ☑ ✔ ✳ ✴ ' +
      '❇ © ® ™ Ⓜ ㊗ ㊙ ▪ ▫ ☷ ☵ ☶ ☋ ☌ ♜ ♕ ♡ ♬ ☚ ♮ ♝ ♯ ☴ ♭ ☓ ☛ ☭ ♢ ✐ ♖ ☈ ☒ ★ ♚ ♛ ✎ ♪ ☰ ☽ ☡ ☼ ♅ ☐ ☟ ❦ ☊ ' +
      '☍ ☬ 7 ♧ ☫ ☱ ☾ ☤ ❧ ♄ ♁ ♔ ❥ ☥ ☻ ♤ ♞ ♆ # ♃ ♩ ☇ ☞ ♫ ☏ ♘ ☧ ☉ ♇ ☩ ♙ ☜ ☲ ☨ ♗ ☳ ⚔ ☕ ⚠'

    const AllowedEmojis = AllowedString.split(' ')
    const emojis = Object.entries(EmojisMap.emoji).filter(([, unicode]) => !AllowedEmojis.includes(unicode))
    for (const [emojiReadable, emojiUnicode] of emojis) {
      message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
    }

    return message
  }
}
