import NodeCache from 'node-cache'

export default class MessageAssociation {
  private readonly messageIds = new NodeCache({ stdTTL: 300 })

  public getMessageId(eventId: string | undefined): DiscordAssociatedMessage[] {
    if (eventId === undefined) return []
    const list: DiscordAssociatedMessage[] = this.messageIds.get(eventId) ?? []
    return [...list]
  }

  public addMessageId(eventId: string, options: DiscordAssociatedMessage): void {
    let list: DiscordAssociatedMessage[] | undefined = this.messageIds.get(eventId)
    list ??= []

    list = list.filter((item) => item.channelId !== options.channelId)
    list.push(options)

    this.messageIds.set(eventId, list)
  }
}

export interface DiscordAssociatedMessage {
  guildId: string | undefined
  channelId: string
  messageId: string
}
