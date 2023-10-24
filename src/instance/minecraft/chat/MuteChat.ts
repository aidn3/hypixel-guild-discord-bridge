import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { sufficeToTime } from '../../../util/SharedUtil'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has muted (the guild chat|(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})) for (\d)([dhms])/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[2]
      const muteTime = Number(match[4])
      const muteSuffice = match[5]

      context.application.punishedUsers.mute(username, muteTime * sufficeToTime(muteSuffice))

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.OFFICER,
        name: EventType.MUTE,
        username: match[1],
        severity: ColorScheme.BAD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
