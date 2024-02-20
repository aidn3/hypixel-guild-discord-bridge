import * as assert from 'node:assert'
import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'
import { LOCATION } from '../../../common/ClientInstance'

export default class SelfBroadcastHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    assert(this.clientInstance.client)

    // first spawn packet
    this.clientInstance.client.on('login', () => {
      this.onSpawn()
    })
    // change world packet
    this.clientInstance.client.on('respawn', () => {
      this.onSpawn()
    })
  }

  private onSpawn(): void {
    const username = this.clientInstance.username()
    const uuid = this.clientInstance.uuid()

    if (username != undefined && uuid != undefined) {
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
