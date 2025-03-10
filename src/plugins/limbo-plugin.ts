import { InstanceType, MinecraftSendChatPriority } from '../common/application-event.js'
import { Status } from '../common/connectable-instance.js'
import PluginInstance from '../common/plugin-instance.js'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../instance/minecraft/minecraft-instance.js'

/* WARNING
THIS IS AN ESSENTIAL PLUGIN! EDITING IT MAY HAVE ADVERSE AFFECTS ON THE APPLICATION
*/
export default class LimboPlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.application.on('instanceStatus', (event) => {
      if (event.status === Status.Connected && event.instanceType === InstanceType.Minecraft) {
        // @ts-expect-error minecraft instances are private
        const localInstance = this.application.minecraftInstances.find(
          (instance) => instance.instanceName === event.instanceName
        )
        if (localInstance != undefined) {
          const clientInstance = localInstance
          // "login" packet is also first spawn packet containing world metadata
          clientInstance.clientSession?.client.on('login', async () => {
            await this.limbo(clientInstance)
          })
          clientInstance.clientSession?.client.on('respawn', async () => {
            await this.limbo(clientInstance)
          })
        }
      }
    })
  }

  private async limbo(clientInstance: MinecraftInstance): Promise<void> {
    this.logger.debug(`Spawn event triggered on ${clientInstance.instanceName}. sending to limbo...`)
    await clientInstance.send('§', MinecraftSendChatPriority.Default, undefined)
  }
}
