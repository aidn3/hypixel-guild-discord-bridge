// noinspection JSUnusedGlobalSymbols

import MinecraftInstance from '../MinecraftInstance'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { CommandsManager } from '../CommandsManager'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    const regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

    const match = regex.exec(message)
    if (match != null) {
      clientInstance.app.emit('event', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.BLOCK,
        username: undefined,
        severity: ColorScheme.INFO,
        message: 'The message has been blocked by Hypixel for breaking the rules.',
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
