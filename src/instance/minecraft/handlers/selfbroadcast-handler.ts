import assert from 'node:assert'

import { InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class SelfbroadcastHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    const clientSession = this.clientInstance.clientSession
    assert(clientSession)

    // first spawn packet
    clientSession.client.on('login', () => {
      this.onSpawn()
    })
    // change world packet
    clientSession.client.on('respawn', () => {
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
