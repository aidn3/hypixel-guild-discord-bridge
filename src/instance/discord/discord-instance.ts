import assert from 'node:assert'

import type { APIEmbed, TextBasedChannelFields, Webhook } from 'discord.js'
import { Client, GatewayIntentBits, Options, Partials, TextChannel } from 'discord.js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { EventType, InstanceType, ChannelType, Severity } from '../../common/application-event.js'
import type {
  ChatEvent,
  ClientEvent,
  InstanceEvent,
  CommandEvent,
  ProfanityWarningEvent
} from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'
import { escapeDiscord } from '../../util/shared-util.js'

import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import StateHandler from './handlers/state-handler.js'

export default class DiscordInstance extends ClientInstance<DiscordConfig> {
  private readonly stateHandler: StateHandler
  private readonly chatManager: ChatManager
  readonly commandsManager: CommandManager
  readonly client: Client
  private connected = false

  constructor(app: Application, instanceName: string, config: DiscordConfig) {
    super(app, instanceName, InstanceType.DISCORD, config)
    this.status = Status.FRESH

    this.client = new Client({
      makeCache: Options.cacheEverything(),
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message]
    })

    this.stateHandler = new StateHandler(this)
    this.chatManager = new ChatManager(this)
    this.commandsManager = new CommandManager(this)

    if (this.config.publicChannelIds.length === 0) {
      this.logger.info('no Discord public channels found')
    }

    if (this.config.officerChannelIds.length === 0) {
      this.logger.info('no Discord officer channels found')
    }

    if (this.config.officerRoleIds.length === 0) {
      this.logger.info('no Discord officer roles found')
    }

    this.app.on('chat', (event: ChatEvent) => {
      void this.onChat(event)
    })
    this.app.on('event', (event: ClientEvent) => {
      void this.onEvent(event)
    })
    this.app.on('instance', (event: InstanceEvent) => {
      void this.onInstance(event)
    })
    this.app.on('command', (event: CommandEvent) => {
      void this.onCommand(event)
    })
    this.app.on('profanityWarning', (event: ProfanityWarningEvent) => {
      void this.onProfanityWarning(event)
    })
  }

  async connect(): Promise<void> {
    assert(this.config.key)

    if (this.connected) {
      this.logger.error('Instance already connected once. Calling connect() again will bug it. Returning...')
      return
    }
    this.connected = true

    this.stateHandler.registerEvents()
    this.chatManager.registerEvents()
    this.commandsManager.registerEvents()

    await this.client.login(this.config.key)
  }

  private async onChat(event: ChatEvent): Promise<void> {
    let channels: string[]
    if (event.channelType === ChannelType.PUBLIC) {
      channels = this.config.publicChannelIds
    } else if (event.channelType === ChannelType.OFFICER) {
      channels = this.config.officerChannelIds
    } else {
      return
    }

    for (const _channelId of channels) {
      if (_channelId === event.channelId) continue

      const webhook = await this.getWebhook(_channelId)
      const displayUsername =
        event.replyUsername == undefined ? event.username : `${event.username}⇾${event.replyUsername}`

      // TODO: integrate instanceName
      await webhook.send({
        content: escapeDiscord(event.message),
        username: displayUsername,
        avatarURL: `https://mc-heads.net/avatar/${encodeURIComponent(event.username)}`
      })
    }
  }

  private lastRepeatEvent = 0
  private lastBlockEvent = 0

  private async onEvent(event: ClientEvent): Promise<void> {
    if (event.instanceName === this.instanceName) return

    if (event.eventType === EventType.REPEAT) {
      if (this.lastRepeatEvent + 5000 < Date.now()) {
        this.lastRepeatEvent = Date.now()
      } else {
        return
      }
    }
    if (event.eventType === EventType.BLOCK) {
      if (this.lastBlockEvent + 5000 < Date.now()) {
        this.lastBlockEvent = Date.now()
      } else {
        return
      }
    }

    let channels: string[]
    if (event.channelType === ChannelType.PUBLIC) {
      channels = this.config.publicChannelIds
    } else if (event.channelType === ChannelType.OFFICER) {
      channels = this.config.officerChannelIds
    } else {
      return
    }
    const embed = {
      description: escapeDiscord(event.message),

      color: event.severity,
      footer: {
        text: event.instanceName
      }
    } satisfies APIEmbed
    if (event.username != undefined) {
      const extra = {
        title: escapeDiscord(event.username),
        url: `https://sky.shiiyu.moe/stats/${encodeURIComponent(event.username)}`,
        thumbnail: { url: `https://cravatar.eu/helmavatar/${encodeURIComponent(event.username)}.png` }
      }
      Object.assign(embed, extra)
    }

    await this.sendEmbed(channels, event.removeLater, embed)
  }

  private async onProfanityWarning(event: ProfanityWarningEvent): Promise<void> {
    const embed = {
      description: `Message by ${escapeDiscord(event.username)} filtered:\n\n'${escapeDiscord(event.oldMessage)}'\n->\n'${escapeDiscord(event.newMessage)}'`,
      color: 0x8a_2d_00,
      footer: {
        text: `${event.instanceName} in ${event.channelType} chat`
      }
    } satisfies APIEmbed

    await this.sendEmbed(this.config.officerChannelIds, false, embed)
  }

  private async sendEmbed(channels: string[], removeLater: boolean, embed: APIEmbed): Promise<void> {
    for (const channelId of channels) {
      const channel = (await this.client.channels.fetch(channelId)) as unknown as TextChannel | null
      if (channel == undefined) return

      const responsePromise = channel.send({ embeds: [embed] })

      if (removeLater) {
        const deleteAfter = this.config.deleteTempEventAfter
        setTimeout(
          () => {
            void responsePromise.then(async (response) => await response.delete())
          },
          deleteAfter * 60 * 1000
        )
      }
    }
  }

  private async onInstance(event: InstanceEvent): Promise<void> {
    if (event.instanceName === this.instanceName) return

    for (const channelId of this.config.publicChannelIds) {
      const channel = await this.client.channels.fetch(channelId)
      if (channel == undefined || !(channel instanceof TextChannel)) continue

      await channel
        .send({
          embeds: [
            {
              title: escapeDiscord(event.instanceName),
              description: escapeDiscord(event.message),
              color: Severity.INFO
            }
          ]
        })
        .then()
    }
  }

  private async onCommand(event: CommandEvent): Promise<void> {
    let channels: string[] = []

    switch (event.channelType) {
      case ChannelType.PUBLIC: {
        channels = this.config.publicChannelIds
        break
      }
      case ChannelType.OFFICER: {
        channels = this.config.officerChannelIds
        break
      }
      case ChannelType.PRIVATE: {
        if (event.discordChannelId) {
          channels = [event.discordChannelId]
        }
        break
      }
    }

    if (event.instanceName === this.instanceName && event.discordChannelId && event.alreadyReplied) {
      channels = channels.filter((id) => id !== event.discordChannelId)
    }
    if (channels.length === 0) return

    const embed = {
      title: escapeDiscord(event.username),
      url: `https://sky.shiiyu.moe/stats/${encodeURIComponent(event.username)}`,
      thumbnail: { url: `https://cravatar.eu/helmavatar/${encodeURIComponent(event.username)}.png` },
      color: Severity.GOOD,
      description: `${escapeDiscord(event.fullCommand)}\n**${escapeDiscord(event.commandResponse)}**`,
      footer: {
        text: event.instanceName
      }
    } satisfies APIEmbed

    await this.sendEmbed(channels, false, embed)
  }

  private async getWebhook(channelId: string): Promise<Webhook> {
    const channel = (await this.client.channels.fetch(channelId)) as unknown as TextBasedChannelFields | null
    if (channel == undefined) throw new Error(`no access to channel ${channelId}?`)
    const webhooks = await channel.fetchWebhooks()

    let webhook = webhooks.find((h) => h.owner?.id === this.client.user?.id)
    if (webhook == undefined) webhook = await channel.createWebhook({ name: 'Hypixel-Guild-Bridge' })
    return webhook
  }
}
