import { EventType, InstanceType, ChannelType } from '../../../common/application-event'
import { ColorScheme } from '../../discord/common/discord-config'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has unmuted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat!|\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]

      const mojangProfile = await context.application.mojangApi.profileByUsername(target).catch(() => undefined)
      const identifiers = [target]
      if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)

      context.application.punishedUsers.forgive({
        localEvent: true,
        instanceType: InstanceType.MINECRAFT,
        instanceName: context.instanceName,
        userIdentifiers: identifiers
      })

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.OFFICER,
        name: EventType.UNMUTE,
        username: responsible,
        severity: ColorScheme.INFO,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
