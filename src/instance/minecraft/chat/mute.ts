import { EventType, InstanceType, ChannelType, PunishmentType } from '../../../common/application-event'
import { sufficeToTime } from '../../../util/shared-util'
import { ColorScheme } from '../../discord/common/discord-config'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has muted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat|\w{3,32}) for (\d)([dhms])/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]
      const muteTime = Number(match[3])
      const muteSuffice = match[4]

      const mojangProfile = await context.application.mojangApi.profileByUsername(target).catch(() => undefined)

      if (responsible !== context.clientInstance.username()) {
        context.application.punishedUsers.punish({
          localEvent: true,
          instanceType: InstanceType.MINECRAFT,
          instanceName: context.instanceName,

          userName: mojangProfile?.name ?? target,
          userUuid: mojangProfile?.id,
          userDiscordId: undefined,

          type: PunishmentType.MUTE,
          till: Date.now() + muteTime * sufficeToTime(muteSuffice) * 1000,
          reason: context.message
        })
      }

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.OFFICER,
        name: EventType.MUTE,
        username: responsible,
        severity: ColorScheme.BAD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
