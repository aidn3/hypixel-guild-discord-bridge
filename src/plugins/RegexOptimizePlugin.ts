import PluginInterface from '../common/PluginInterface'
import Application from '../Application'
import { ClientInstance, LOCATION } from '../common/ClientInstance'
import { InstanceEventType } from '../common/ApplicationEvent'
import MinecraftInstance from '../instance/minecraft/MinecraftInstance'

import { getEventListeners } from 'events'

/*
 * Event 'messagestr' is used by some complicated regex that can take MINUTES to resolve
 * Those internal feature that uses the regex aren't needed by this project.
 * Hence removing them will improve client stability
 */
export default {
  onRun (app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
    app.on('instance', (event) => {
      if (event.type === InstanceEventType.create && event.location === LOCATION.MINECRAFT) {
        const localInstance = getLocalInstance(event.instanceName)
        if (localInstance != null) {
          const client = (localInstance as MinecraftInstance)?.client
          client?.on('messagestr', () => {
            console.log('Removing buggy code')
            const listeners = getEventListeners(client, 'messagestr')
            listeners.forEach((l: any) => client?.removeListener('messagestr', l))
          })
        }
      }
    })
  }
} satisfies PluginInterface
