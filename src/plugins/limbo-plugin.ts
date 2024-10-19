import { InstanceEventType, InstanceType } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'
import MinecraftInstance from '../instance/minecraft/minecraft-instance.js'

/* WARNING
THIS IS AN ESSENTIAL PLUGIN! EDITING IT MAY HAVE ADVERSE AFFECTS ON THE APPLICATION
*/

async function limbo(clientInstance: MinecraftInstance): Promise<void> {
  clientInstance.logger.debug('Spawn event triggered. sending to limbo...')
  await clientInstance.send('§')
}

/*
 * Permanently trap Minecraft client in limbo and prevent it from leaving
 */
export default {
  onRun(context: PluginContext): void {
    context.application.on('instance', (event) => {
      if (event.type === InstanceEventType.Created && event.instanceType === InstanceType.Minecraft) {
        const localInstance = context.localInstances.find(
          (instance) => instance instanceof MinecraftInstance && instance.instanceName === event.instanceName
        )
        if (localInstance != undefined) {
          const clientInstance = localInstance as MinecraftInstance
          // "login" packet is also first spawn packet containing world metadata
          clientInstance.clientSession?.client.on('login', async () => {
            await limbo(clientInstance)
          })
          clientInstance.clientSession?.client.on('respawn', async () => {
            await limbo(clientInstance)
          })
        }
      }
    })
  }
} satisfies PluginInterface
