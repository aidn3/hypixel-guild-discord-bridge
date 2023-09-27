import { getEventListeners } from 'node:events'
import { PluginContext, PluginInterface } from '../common/Plugins'
import { LOCATION } from '../common/ClientInstance'
import { InstanceEventType } from '../common/ApplicationEvent'
import MinecraftInstance from '../instance/minecraft/MinecraftInstance'

/*
 * Event 'messagestr' is used by some complicated regex that can take MINUTES to resolve
 * Those internal feature that uses the regex aren't needed by this project.
 * Hence removing them will improve client stability
 */
export default {
  onRun(context: PluginContext): void {
    context.application.on('instance', (event) => {
      if (event.type === InstanceEventType.create && event.location === LOCATION.MINECRAFT) {
        const localInstance = context.getLocalInstance(event.instanceName)
        if (localInstance != undefined) {
          const client = (localInstance as MinecraftInstance).client
          client?.on('messagestr', () => {
            console.log('Removing buggy code')
            const listeners = getEventListeners(client, 'messagestr')
            for (const l of listeners) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-explicit-any
              client.removeListener('messagestr', l)
            }
          })
        }
      }
    })
  }
} satisfies PluginInterface
