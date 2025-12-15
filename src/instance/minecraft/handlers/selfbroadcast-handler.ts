import type { InstanceType } from '../../../common/application-event.js'
import SubInstance from '../../../common/sub-instance'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class SelfbroadcastHandler extends SubInstance<
  MinecraftInstance,
  InstanceType.Minecraft,
  ClientSession
> {
  override registerEvents(clientSession: ClientSession): void {
    // first spawn packet
    clientSession.client.on('login', () => {
      void this.onSpawn().catch(this.errorHandler.promiseCatch('handling onSpawn() function'))
    })
    // change world packet
    clientSession.client.on('respawn', () => {
      void this.onSpawn().catch(this.errorHandler.promiseCatch('handling onSpawn() function'))
    })
  }

  private async onSpawn(): Promise<void> {
    const username = this.clientInstance.username()
    const uuid = this.clientInstance.uuid()

    if (username != undefined && uuid != undefined) {
      await this.application.emit('minecraftSelfBroadcast', {
        ...this.eventHelper.fillBaseEvent(),

        uuid,
        username
      })
    }
  }
}
