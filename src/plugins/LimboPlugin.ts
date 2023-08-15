import MinecraftInstance from '../instance/minecraft/MinecraftInstance'
import Application from '../Application'
import { InstanceEventType } from '../common/ApplicationEvent'
import PluginInterface from '../common/PluginInterface'
import { ClientInstance, LOCATION } from '../common/ClientInstance'

async function limbo (clientInstance: MinecraftInstance): Promise<void> {
  clientInstance.logger.debug('Spawn event triggered. sending to limbo...')
  await clientInstance.send('§')
}

/*
 * Stuck minecraft client in limbo and prevent it from ever leaving
 */
export default {
  onRun (app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
    app.on('instance', (event) => {
      if (event.type === InstanceEventType.create && event.location === LOCATION.MINECRAFT) {
        const localInstance = getLocalInstance(event.instanceName)
        if (localInstance != null) {
          const clientInstance = localInstance as MinecraftInstance
          clientInstance.client?.on('spawn', async () => { await limbo(clientInstance) })
          clientInstance.client?.on('respawn', async () => { await limbo(clientInstance) })
        }
      }
    })
  }
} satisfies PluginInterface
