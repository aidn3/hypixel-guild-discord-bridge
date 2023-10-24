import { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { EventType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has unmuted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat!|\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      console.log(match)
      const responsible = match[1]
      const victim = match[2]

      context.application.punishedUsers.unmute(victim)

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.OFFICER,
        name: EventType.UNMUTE,
        username: responsible,
        severity: ColorScheme.INFO,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
