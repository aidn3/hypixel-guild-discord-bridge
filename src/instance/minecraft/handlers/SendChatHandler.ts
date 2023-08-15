import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'
import { MinecraftSendChat } from '../../../common/ApplicationEvent'

export default class SendChatHandler extends EventHandler<MinecraftInstance> {
  registerEvents (): void {
    this.clientInstance.app.on('minecraftSend', event => {
      void this.onCommand(event)
    })
  }

  private async onCommand (event: MinecraftSendChat): Promise<void> {
    if (event.targetInstanceName === null || event.targetInstanceName === this.clientInstance.instanceName) {
      await this.clientInstance.send(event.command)
    }
  }
}
