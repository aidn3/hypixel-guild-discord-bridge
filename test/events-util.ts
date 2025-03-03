import type Application from '../src/application.js'
import type { InstanceIdentifier } from '../src/common/application-event.js'
import { ChannelType, InstanceType } from '../src/common/application-event.js'
import EventHelper from '../src/common/event-helper.js'
import { InternalInstancePrefix } from '../src/common/instance.js'

export class EventsUtil implements InstanceIdentifier {
  public readonly instanceName: string = InternalInstancePrefix + 'EventsUtil'
  public readonly instanceType: InstanceType.Discord = InstanceType.Discord
  public readonly eventHelper = new EventHelper<InstanceType.Discord>(this.instanceName, this.instanceType)

  constructor(private readonly application: Application) {
    this.application.applicationIntegrity.addLocalInstance(this)
  }
  public simulateChat(username: string, message: string) {
    this.application.emit('chat', {
      ...this.eventHelper.fillBaseEvent(),

      channelId: '0',
      channelType: ChannelType.Public,

      username: username,
      replyUsername: undefined,
      message: message
    })
  }
}
