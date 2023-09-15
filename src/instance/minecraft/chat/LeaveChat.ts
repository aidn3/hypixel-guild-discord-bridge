import { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) left the guild!/g

    const match = regex.exec(context.message)
    if (match != null) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.LEAVE,
        username,
        severity: ColorScheme.BAD,
        message: `${username} left the guild!`,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
