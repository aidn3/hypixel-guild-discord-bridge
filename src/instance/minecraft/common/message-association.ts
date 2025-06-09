import NodeCache from 'node-cache'

import type { ChannelType } from '../../../common/application-event.js'

export default class MessageAssociation {
  private readonly messageIds = new NodeCache({ stdTTL: 300 })

  public getMessageId(eventId: string | undefined): MinecraftAssociatedMessage | undefined {
    if (eventId === undefined) return undefined
    return this.messageIds.get(eventId)
  }

  public addMessageId(eventId: string, option: MinecraftAssociatedMessage): void {
    this.messageIds.set(eventId, option)
  }
}

export type MinecraftAssociatedMessage = OpenMessageAssociation | PrivateMessageAssociation

interface OpenMessageAssociation {
  channel: ChannelType.Public | ChannelType.Officer
}

interface PrivateMessageAssociation {
  channel: ChannelType.Private
  username: string
}
