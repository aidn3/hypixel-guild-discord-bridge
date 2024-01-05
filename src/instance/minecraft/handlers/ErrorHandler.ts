import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'

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
        void this.clientInstance.connect()
      }, 30_000)
    }
  }
}
