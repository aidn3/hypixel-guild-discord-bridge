import * as assert from 'node:assert'
import * as getMinecraftData from 'minecraft-data'
import { ChatMessage } from 'prismarine-chat'
import EventHandler from '../../common/EventHandler'
import { LOCATION } from '../../common/ClientInstance'
import MinecraftInstance from './MinecraftInstance'
import { MinecraftChatMessage } from './common/ChatInterface'
import { CommandsManager } from './CommandsManager'

import BlockChat from './chat/BlockChat'
import DemoteChat from './chat/DemoteChat'
import JoinChat from './chat/JoinChat'
import KickChat from './chat/KickChat'
import LeaveChat from './chat/LeaveChat'
import MuteChat from './chat/MuteChat'
import OfficerChat from './chat/OfficerChat'
import OfflineChat from './chat/OfflineChat'
import OnlineChat from './chat/OnlineChat'
import PrivateChat from './chat/PrivateChat'
import PromoteChat from './chat/PromoteChat'
import PublicChat from './chat/PublicChat'
import QuestChat from './chat/QuestChat'
import RepeatChat from './chat/RepeatChat'
import RequestChat from './chat/RequestChat'
import UnmuteChat from './chat/UnmuteChat'

export default class ChatManager extends EventHandler<MinecraftInstance> {
  private readonly commandsManager: CommandsManager
  private readonly chatModules: MinecraftChatMessage[]

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)
    this.commandsManager = new CommandsManager(clientInstance)
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

    this.commandsManager.registerEvents()
  }

  private onMessage(message: string): void {
    for (const module of this.chatModules) {
      module.onChat({
        application: this.clientInstance.app,
        clientInstance: this.clientInstance,
        instanceName: this.clientInstance.instanceName,
        commandsManager: this.commandsManager,
        message
      })
    }

    this.clientInstance.app.emit('minecraftChat', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      location: LOCATION.MINECRAFT,
      message
    })
  }
}
