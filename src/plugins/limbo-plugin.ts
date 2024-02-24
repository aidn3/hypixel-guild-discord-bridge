import type MinecraftInstance from '../instance/minecraft/minecraft-instance'
import { InstanceEventType, InstanceType } from '../common/application-event'
import type { PluginInterface, PluginContext } from '../common/plugins'

async function limbo(clientInstance: MinecraftInstance): Promise<void> {
  clientInstance.logger.debug('Spawn event triggered. sending to limbo...')
  await clientInstance.send('§')
}

/*
 * Stuck minecraft client in limbo and prevent it from ever leaving
 */
export default {
  onRun(context: PluginContext): void {
    context.application.on('instance', (event) => {
      if (event.type === InstanceEventType.create && event.instanceType === InstanceType.MINECRAFT) {
        const localInstance = context.getLocalInstance(event.instanceName)
        if (localInstance != undefined) {
          const clientInstance = localInstance as MinecraftInstance
          // "login" packet is also first spawn packet containing world metadata
          clientInstance.client?.on('login', async () => {
            await limbo(clientInstance)
          })
          clientInstance.client?.on('respawn', async () => {
            await limbo(clientInstance)
          })
        }
      }
    })
  }
} satisfies PluginInterface
