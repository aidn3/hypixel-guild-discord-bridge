import MinecraftInstance from '../MinecraftInstance'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'
import { sufficeToTime } from '../../../util/SharedUtil'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { CommandsManager } from '../CommandsManager'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    const regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has muted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) for (\d)([smhd])/g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]
      const muteTime = match[2] as any
      const muteSuffice = match[3]

      clientInstance.app.punishedUsers.mute(username, muteTime * sufficeToTime(muteSuffice))

      clientInstance.app.emit('event', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.OFFICER,
        name: EventType.MUTE,
        username,
        severity: ColorScheme.BAD,
        message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
