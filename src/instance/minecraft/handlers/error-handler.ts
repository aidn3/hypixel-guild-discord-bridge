import { InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class StateHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    this.clientInstance.client?.on('error', (error: Error) => {
      this.onError(error)
    })
  }

  private onError(error: Error & { code?: string }): void {
    this.clientInstance.logger.error('Minecraft Bot Error: ', error)
    if (error.code === 'EAI_AGAIN') {
      this.clientInstance.logger.error(
        'Minecraft bot disconnected due to internet problems. Restarting client in 30 seconds...'
      )
      setTimeout(() => {
        this.clientInstance.connect()
      }, 30_000)
    } else if (error.message.includes('does the account own minecraft')) {
      this.clientInstance.app.emit('statusMessage', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        instanceType: InstanceType.MINECRAFT,
        message:
          'Error: does the account own minecraft? changing skin (and deleting cache) and reconnecting might help fix the problem.'
      })
    }
  }
}
