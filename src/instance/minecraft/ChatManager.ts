import { ChatMessage } from 'prismarine-chat'
import EventHandler from '../../common/EventHandler'
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
      PublicChat,
      RepeatChat,
      RequestChat,
      UnmuteChat
    ]
  }

  registerEvents(): void {
    this.clientInstance.client?.on('message', (message: ChatMessage) => {
      this.onMessage(message.toString().trim())
    })
    this.commandsManager.registerEvents()
  }

  private onMessage(message: string): void {
    for (const e of this.chatModules) {
      e.onChat({
        application: this.clientInstance.app,
        clientInstance: this.clientInstance,
        instanceName: this.clientInstance.instanceName,
        commandsManager: this.commandsManager,
        message
      })
    }
  }
}
