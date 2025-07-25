import type Application from '../src/application.js'
import type { InstanceIdentifier } from '../src/common/application-event.js'
import { ChannelType, InstanceType, Permission } from '../src/common/application-event.js'
import EventHelper from '../src/common/event-helper.js'
import { InternalInstancePrefix } from '../src/common/instance.js'

export class EventsUtility implements InstanceIdentifier {
  public readonly instanceName: string = InternalInstancePrefix + 'EventsUtility'
  public readonly instanceType: InstanceType.Discord = InstanceType.Discord
  public readonly eventHelper = new EventHelper<InstanceType.Discord>(this.instanceName, this.instanceType)

  constructor(private readonly application: Application) {
    //this.application.applicationIntegrity.addLocalInstance(this)
  }
  public simulateChat(username: string, message: string) {
    this.application.emit('chat', {
      ...this.eventHelper.fillBaseEvent(),

      channelId: '0',
      channelType: ChannelType.Public,

      permission: Permission.Anyone,
      userId: '123',
      username: username,
      replyUsername: undefined,
      message: message
    })
  }
}
