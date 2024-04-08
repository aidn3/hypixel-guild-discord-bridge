import { LOCATION, SCOPE } from "../../../common/ClientInstance"
import { MinecraftChatContext, MinecraftChatMessage } from "../common/ChatInterface"
import { ColorScheme } from "../../discord/common/DiscordConfig"
import { EventType } from "../../../common/ApplicationEvent"

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit("event", {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.BLOCK,
        username: undefined,
        severity: ColorScheme.INFO,
        message: "The message has been blocked by Hypixel for breaking the rules.",
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
