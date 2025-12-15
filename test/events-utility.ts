import type Application from '../src/application.js'
import type { InstanceIdentifier } from '../src/common/application-event.js'
import { ChannelType, InstanceType } from '../src/common/application-event.js'
import EventHelper from '../src/common/event-helper.js'
import { InternalInstancePrefix } from '../src/common/instance.js'

export class EventsUtility implements InstanceIdentifier {
  public readonly instanceName: string = InternalInstancePrefix + 'EventsUtility'
  public readonly instanceType: InstanceType.Discord = InstanceType.Discord
  public readonly eventHelper = new EventHelper<InstanceType.Discord>(this.instanceName, this.instanceType)

  constructor(private readonly application: Application) {
    //this.application.applicationIntegrity.addLocalInstance(this)
  }

  public async simulateChat(username: string, message: string) {
    await this.application.emit('chat', {
      ...this.eventHelper.fillBaseEvent(),

      channelId: '0',
      channelType: ChannelType.Public,

      user: await this.application.core.initializeDiscordUser(
        { id: '123', username: username, displayName: username, avatar: undefined },
        {}
      ),
      replyUsername: undefined,
      message: message
    })
  }
}
