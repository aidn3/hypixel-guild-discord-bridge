import MinecraftInstance from '../MinecraftInstance'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { CommandsManager } from '../CommandsManager'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    const regex = /^Guild > (\w{3,32}) left./g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]

      clientInstance.app.emit('event', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.OFFLINE,
        username,
        severity: ColorScheme.INFO,
        message,
        removeLater: true
      })
    }
  }
} satisfies MinecraftChatMessage
