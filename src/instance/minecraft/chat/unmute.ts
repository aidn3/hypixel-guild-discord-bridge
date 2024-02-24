import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'
import { ColorScheme } from '../../discord/common/discord-config'
import { EventType, InstanceType, ChannelType, PunishmentType } from '../../../common/application-event'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has unmuted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat!|\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]

      context.application.emit('punish', {
        localEvent: true,
        instanceType: InstanceType.MINECRAFT,
        instanceName: context.instanceName,

        name: target,
        type: PunishmentType.MUTE,
        till: 0,
        forgive: true
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
