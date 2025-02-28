import NodeCache from 'node-cache'

export default class MessageAssociation {
  private readonly messageIds = new NodeCache({ stdTTL: 60 })

  public getMessageId(eventId: string): DiscordAssociatedMessage | undefined {
    return this.messageIds.get(eventId)
  }

  public addMessageId(eventId: string, options: DiscordAssociatedMessage): void {
    this.messageIds.set(eventId, options)
  }
}

export interface DiscordAssociatedMessage {
  channelId: string
  messageId: string
}
