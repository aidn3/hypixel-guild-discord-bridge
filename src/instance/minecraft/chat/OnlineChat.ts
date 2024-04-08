import { MinecraftChatContext, MinecraftChatMessage } from "../common/ChatInterface"
import { LOCATION, SCOPE } from "../../../common/ClientInstance"
import { ColorScheme } from "../../discord/common/DiscordConfig"
import { EventType } from "../../../common/ApplicationEvent"

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Guild > (\w{3,32}) joined./g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit("event", {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.ONLINE,
        username,
        severity: ColorScheme.INFO,
        message: context.message,
        removeLater: true
      })
    }
  }
} satisfies MinecraftChatMessage
