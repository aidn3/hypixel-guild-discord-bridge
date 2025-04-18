import type Application from '../application.js'
import { InstanceType, MinecraftSendChatPriority } from '../common/application-event.js'
import { OfficialPlugins } from '../common/application-internal-config.js'
import { Status } from '../common/connectable-instance.js'
import type { PluginInfo } from '../common/plugin-instance.js'
import PluginInstance from '../common/plugin-instance.js'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../instance/minecraft/minecraft-instance.js'

export default class LimboPlugin extends PluginInstance {
  constructor(application: Application) {
    super(application, OfficialPlugins.Limbo)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Trap Minecraft client to stay in Hypixel limbo', conflicts: [OfficialPlugins.Warp] }
  }

  onReady(): Promise<void> | void {
    this.application.on('instanceStatus', (event) => {
      if (event.status === Status.Connected && event.instanceType === InstanceType.Minecraft) {
        const localInstance = this.application.minecraftManager
          .getAllInstances()
          .find((instance) => instance.instanceName === event.instanceName)
        if (localInstance != undefined) {
          void this.limbo(localInstance).catch(this.errorHandler.promiseCatch('handling /limbo command'))
          // "login" packet is also first spawn packet containing world metadata
          localInstance.clientSession?.client.on('login', async () => {
            await this.limbo(localInstance)
          })
          localInstance.clientSession?.client.on('respawn', async () => {
            await this.limbo(localInstance)
          })
        }
      }
    })
  }

  private async limbo(clientInstance: MinecraftInstance): Promise<void> {
    if (!this.enabled()) return

    this.logger.debug(`Spawn event triggered on ${clientInstance.instanceName}. sending to limbo...`)
    await clientInstance.send('/limbo', MinecraftSendChatPriority.Default, undefined)
  }
}
