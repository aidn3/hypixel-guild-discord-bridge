import { ChatMessage } from 'prismarine-chat'
import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'
import { LOCATION } from '../../../common/ClientInstance'

export default class RawChatHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    this.clientInstance.client?.on('message', (message: ChatMessage) => {
      this.onRawMessage(message.toString().trim())
    })
  }

  private onRawMessage(message: string): void {
    this.clientInstance.app.emit('minecraftChat', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      location: LOCATION.MINECRAFT,
      message
    })
  }
}
