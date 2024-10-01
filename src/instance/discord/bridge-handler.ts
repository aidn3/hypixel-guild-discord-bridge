import type { APIEmbed, TextBasedChannelFields, Webhook } from 'discord.js'
import { TextChannel } from 'discord.js'

import type {
  ChatEvent,
  ClientEvent,
  CommandEvent,
  CommandFeedbackEvent,
  InstanceEvent
} from '../../common/application-event.js'
import { ChannelType, EventType, Severity } from '../../common/application-event.js'
import BridgeHandler from '../../common/bridge-handler.js'
import { escapeDiscord } from '../../util/shared-util.js'

import type DiscordInstance from './discord-instance.js'

export default class DiscordBridgeHandler extends BridgeHandler<DiscordInstance> {
  async onInstance(event: InstanceEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return

    for (const channelId of this.clientInstance.config.publicChannelIds) {
      const channel = await this.clientInstance.client.channels.fetch(channelId)
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

  async onChat(event: ChatEvent): Promise<void> {
    let channels: string[]
    if (event.channelType === ChannelType.PUBLIC) {
      channels = this.clientInstance.config.publicChannelIds
    } else if (event.channelType === ChannelType.OFFICER) {
      channels = this.clientInstance.config.officerChannelIds
    } else {
      return
    }

    for (const channelId of channels) {
      if (channelId === event.channelId) continue

      const webhook = await this.getWebhook(channelId)
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

  async onClientEvent(event: ClientEvent): Promise<void> {
    if (event.instanceName === this.clientInstance.instanceName) return

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

    const channels: string[] = []

    switch (event.eventType) {
      case EventType.AUTOMATED: {
        if (event.channelType === ChannelType.PUBLIC) {
          channels.push(...this.clientInstance.config.publicChannelIds)
        } else if (event.channelType === ChannelType.OFFICER) {
          channels.push(...this.clientInstance.config.officerChannelIds)
        } else {
          return
        }
        break
      }

      case EventType.REQUEST:
      case EventType.JOIN:
      case EventType.LEAVE:
      case EventType.KICK:
      case EventType.PROMOTE:
      case EventType.DEMOTE: {
        channels.push(...this.clientInstance.config.publicChannelIds, ...this.clientInstance.config.officerChannelIds)
        break
      }

      case EventType.MUTE:
      case EventType.UNMUTE: {
        channels.push(...this.clientInstance.config.officerChannelIds)
        break
      }

      case EventType.BLOCK:
      case EventType.MUTED:
      case EventType.OFFLINE:
      case EventType.ONLINE:
      case EventType.QUEST:
      case EventType.REPEAT: {
        channels.push(...this.clientInstance.config.publicChannelIds)
        break
      }

      default: {
        return
      }
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

  async onCommand(event: CommandEvent): Promise<void> {
    await this.sendCommandResponse(event, false)
  }

  async onCommandFeedback(event: CommandFeedbackEvent): Promise<void> {
    await this.sendCommandResponse(event, true)
  }

  private async sendEmbed(channels: string[], removeLater: boolean, embed: APIEmbed): Promise<void> {
    for (const channelId of channels) {
      const channel = (await this.clientInstance.client.channels.fetch(channelId)) as unknown as TextChannel | null
      if (channel == undefined) return

      const responsePromise = channel.send({ embeds: [embed] })

      if (removeLater) {
        const deleteAfter = this.clientInstance.config.deleteTempEventAfter
        setTimeout(
          () => {
            void responsePromise.then(async (response) => await response.delete())
          },
          deleteAfter * 60 * 1000
        )
      }
    }
  }

  private async sendCommandResponse(event: CommandEvent, feedback: boolean): Promise<void> {
    let channels: string[] = []

    switch (event.channelType) {
      case ChannelType.PUBLIC: {
        channels = this.clientInstance.config.publicChannelIds
        break
      }
      case ChannelType.OFFICER: {
        channels = this.clientInstance.config.officerChannelIds
        break
      }
      case ChannelType.PRIVATE: {
        if (event.discordChannelId) {
          channels = [event.discordChannelId]
        }
        break
      }
    }

    if (event.instanceName === this.clientInstance.instanceName && event.discordChannelId && event.alreadyReplied) {
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
        text: `${event.instanceName}${feedback ? ' (command feedback)' : ''}`
      }
    } satisfies APIEmbed

    await this.sendEmbed(channels, false, embed)
  }

  private async getWebhook(channelId: string): Promise<Webhook> {
    const channel = (await this.clientInstance.client.channels.fetch(
      channelId
    )) as unknown as TextBasedChannelFields | null
    if (channel == undefined) throw new Error(`no access to channel ${channelId}?`)
    const webhooks = await channel.fetchWebhooks()

    let webhook = webhooks.find((h) => h.owner?.id === this.clientInstance.client.user?.id)
    if (webhook == undefined) webhook = await channel.createWebhook({ name: 'Hypixel-Guild-Bridge' })
    return webhook
  }
}
