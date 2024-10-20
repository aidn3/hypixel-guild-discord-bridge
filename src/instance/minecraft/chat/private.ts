import { InstanceType, ChannelType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    const regex = /^From (?:\[[+A-Z]{3,10}] ){0,3}(\w{3,32}): (.{1,128})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (context.application.clusterHelper.isMinecraftBot(username)) return

      context.application.emit('chat', {
        localEvent: true,

        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,

        channelType: ChannelType.Private,
        channelId: undefined,

        username,
        replyUsername: undefined,
        message: playerMessage
      })
    }
  }
} satisfies MinecraftChatMessage
