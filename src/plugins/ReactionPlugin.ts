import * as assert from 'assert'
import { PluginInterface, PluginContext } from '../common/Plugins'
import { EventType } from '../common/ApplicationEvent'

const JoinMessages = [
  'Welcome %s to our guild!',
  '%s, what a nice new member :)',
  'Psst %s. You just joined. Do /g discord :D',
  '%s since you just joined, do !e',
  'Can we just take a moment to contextlaud %s for joining us :3',
  '%s is op for joining the guild',
  'Hey %s and welcome to the guild!',
  '%s nice, new member!'
]

const LeaveMessages = [
  'Oh. %s just left us :(',
  'L %s for leaving',
  'See you later %s',
  'Adios %s o/',
  "%s wasn't cool enough for us.",
  '%s left. I wonder why?',
  '%s left. What a shame.'
]

const KickMessages = [
  '%s got drop kicked! LOL',
  'See you later %s, or not :P',
  '%s was forcefully evicted.',
  "%s wasn't welcome here.",
  'Goodbye %s. Forever.'
]

export default {
  onRun(context: PluginContext): void {
    context.application.on('event', (event) => {
      if (!context.config.allowSocketInstance && context.getLocalInstance(event.instanceName) == null) return

      if (event.name === EventType.JOIN) {
        assert(event.username)
        let message = JoinMessages[Math.floor(Math.random() * JoinMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }

      if (event.name === EventType.LEAVE) {
        assert(event.username)
        let message = LeaveMessages[Math.floor(Math.random() * LeaveMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }

      if (event.name === EventType.KICK) {
        assert(event.username)
        let message = KickMessages[Math.floor(Math.random() * KickMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }
    })
  }
} satisfies PluginInterface
