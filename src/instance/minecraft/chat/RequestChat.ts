import { LOCATION, SCOPE } from "../../../common/ClientInstance"
import { escapeDiscord } from "../../../util/DiscordMessageUtil"
import { MinecraftChatContext, MinecraftChatMessage } from "../common/ChatInterface"
import { ColorScheme } from "../../discord/common/DiscordConfig"
import { EventType } from "../../../common/ApplicationEvent"

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^-{53}\n\[[+A-Za-z]{3,10}] {0,3}(\w{3,32}) has requested to join the Guild/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit("event", {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        name: EventType.REQUEST,
        username,
        severity: ColorScheme.GOOD,
        message: `${escapeDiscord(username)} has requested to join the guild!`,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
