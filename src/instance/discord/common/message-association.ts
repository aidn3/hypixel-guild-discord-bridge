import NodeCache from 'node-cache'

export default class MessageAssociation {
  private readonly messageIds = new NodeCache({ maxKeys: 20, stdTTL: 30 * 60 })

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
