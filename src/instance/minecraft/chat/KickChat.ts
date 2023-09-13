import MinecraftInstance from '../MinecraftInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { CommandsManager } from '../CommandsManager'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    const regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) was kicked from the guild by .{1,32}!$/g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]

      clientInstance.app.emit('event', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.KICK,
        username,
        severity: ColorScheme.BAD,
        message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
