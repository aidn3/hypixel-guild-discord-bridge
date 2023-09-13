import PluginInterface from '../common/PluginInterface'
import Application from '../Application'
import { ClientInstance } from '../common/ClientInstance'
import { EventType } from '../common/ApplicationEvent'

const MESSAGES = [
  'Welcome %s to our guild!',
  '%s, What a nice new member :)',
  'Psst %s. You just joined. Do /g discord :D',
  '%s since you just joined, do !e',
  "Hi %s, I'll tell you once since you just joined. I'm a fragbot. Party me if needed.",
  'Can we just take a moment to applaud %s for joining us :3',
  '%s is op for joining the guild',
  'hey %s and welcome to the guild!',
  '%s Nice, new member'
]

export default {
  onRun(app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
    app.on('event', (event) => {
      if (event.name !== EventType.JOIN) return
      if (!app.config.plugins.allowSocketInstance && getLocalInstance(event.instanceName) == null) return

      let message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      message = message.replaceAll('%s', event.username as string)
      app.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
    })
  }
} satisfies PluginInterface
