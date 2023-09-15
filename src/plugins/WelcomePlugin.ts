import { PluginInterface, PluginContext } from '../common/Plugins'
import { EventType } from '../common/ApplicationEvent'
import * as assert from 'assert'

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
  onRun(context: PluginContext): void {
    context.application.on('event', (event) => {
      if (event.name !== EventType.JOIN) return
      if (!context.config.allowSocketInstance && context.getLocalInstance(event.instanceName) == null) return
      assert(event.username)

      let message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      message = message.replaceAll('%s', event.username)
      context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
    })
  }
} satisfies PluginInterface
