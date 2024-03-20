import assert from 'node:assert'

import { InstanceType } from '../../../common/application-event'
import EventHandler from '../../../common/event-handler'
import type MinecraftInstance from '../minecraft-instance'

export default class SelfbroadcastHandler extends EventHandler<MinecraftInstance> {
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
        instanceType: InstanceType.MINECRAFT,
        uuid,
        username
      })
    }
  }
}
