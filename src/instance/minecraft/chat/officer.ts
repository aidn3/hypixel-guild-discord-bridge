import { InstanceType, ChannelType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: Officer > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Officer > (?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})(?: \[\w{1,10}]){0,3}:(.{1,256})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (
        context.clientInstance.bridgePrefix.length > 0 &&
        playerMessage.startsWith(context.clientInstance.bridgePrefix)
      )
        return
      if (context.clientInstance.app.clusterHelper.isMinecraftBot(username)) return

      context.application.emit('chat', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.OFFICER,
        channelId: undefined,
        username,
        replyUsername: undefined,
        message: playerMessage
      })
    }
  }
} satisfies MinecraftChatMessage
