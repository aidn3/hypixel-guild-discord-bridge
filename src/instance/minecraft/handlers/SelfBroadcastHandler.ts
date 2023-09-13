import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'
import { LOCATION } from '../../../common/ClientInstance'

export default class SelfBroadcastHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    this.clientInstance.client?.on('spawn', () => {
      this.onSpawn()
    })
  }

  private onSpawn(): void {
    const username = this.clientInstance.username()
    const uuid = this.clientInstance.uuid()

    if (username != null && uuid != null) {
      this.clientInstance.app.emit('minecraftSelfBroadcast', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        uuid,
        username
      })
    }
  }
}
