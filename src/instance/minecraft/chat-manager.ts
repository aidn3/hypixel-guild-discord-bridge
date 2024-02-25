import assert from 'node:assert'

import getMinecraftData from 'minecraft-data'
import type { ChatMessage } from 'prismarine-chat'

import { InstanceType } from '../../common/application-event'
import EventHandler from '../../common/event-handler'

import BlockChat from './chat/block'
import DemoteChat from './chat/demote'
import JoinChat from './chat/join'
import KickChat from './chat/kick'
import LeaveChat from './chat/leave'
import MuteChat from './chat/mute'
import OfficerChat from './chat/officer'
import OfflineChat from './chat/offline'
import OnlineChat from './chat/online'
import PrivateChat from './chat/private'
import PromoteChat from './chat/promote'
import PublicChat from './chat/public'
import QuestChat from './chat/quest'
import RepeatChat from './chat/repeat'
import RequestChat from './chat/request'
import UnmuteChat from './chat/unmute'
import type { MinecraftChatMessage } from './common/chat-interface'
import type MinecraftInstance from './minecraft-instance'

export default class ChatManager extends EventHandler<MinecraftInstance> {
  private readonly chatModules: MinecraftChatMessage[]

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)
    this.chatModules = [
      BlockChat,
      DemoteChat,
      JoinChat,
      KickChat,
      LeaveChat,
      MuteChat,
      OfficerChat,
      OfflineChat,
      OnlineChat,
      PrivateChat,
      PromoteChat,
      QuestChat,
      PublicChat,
      RepeatChat,
      RequestChat,
      UnmuteChat
    ]
  }

  registerEvents(): void {
    assert(this.clientInstance.client)
    assert(this.clientInstance.registry)

    const prismChat = this.clientInstance.prismChat
    const minecraftData = getMinecraftData(this.clientInstance.client.version)

    this.clientInstance.client.on('systemChat', (data) => {
      const chatMessage = prismChat.fromNotch(data.formattedMessage)
      this.onMessage(chatMessage.toString())
    })

    this.clientInstance.client.on('playerChat', (data: object) => {
      const message = (data as { formattedMessage?: string }).formattedMessage
      let resultMessage: ChatMessage & Partial<{ unsigned: ChatMessage }>

      if (minecraftData.supportFeature('clientsideChatFormatting')) {
        const verifiedPacket = data as {
          senderName?: string
          targetName?: string
          plainMessage: string
          unsignedContent?: string
          type: number
        }
        const parameters: { content: object; sender?: object; target?: object } = {
          content: message ? (JSON.parse(message) as object) : { text: verifiedPacket.plainMessage }
        }

        if (verifiedPacket.senderName) {
          Object.assign(parameters, { sender: JSON.parse(verifiedPacket.senderName) as object })
        }
        if (verifiedPacket.targetName) {
          Object.assign(parameters, { target: JSON.parse(verifiedPacket.targetName) as object })
        }
        resultMessage = prismChat.fromNetwork(verifiedPacket.type, parameters as Record<string, object>)

        if (verifiedPacket.unsignedContent) {
          resultMessage.unsigned = prismChat.fromNetwork(verifiedPacket.type, {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sender: parameters.sender!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            target: parameters.target!,
            content: JSON.parse(verifiedPacket.unsignedContent) as object
          })
        }
      } else {
        assert(message) // old packet means message exist
        resultMessage = prismChat.fromNotch(message)
      }

      this.onMessage(resultMessage.toString())
    })
  }

  private onMessage(message: string): void {
    for (const module of this.chatModules) {
      module.onChat({
        application: this.clientInstance.app,
        clientInstance: this.clientInstance,
        instanceName: this.clientInstance.instanceName,
        message
      })
    }

    this.clientInstance.app.emit('minecraftChat', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      instanceType: InstanceType.MINECRAFT,
      message
    })
  }
}
