import assert from 'node:assert'

import { EventType } from '../common/application-event.js'
import type { PluginInterface, PluginContext } from '../common/plugins.js'

const JoinMessages = [
  'Welcome %s to our guild! Do /g discord and !help for ingame commands :-)',
  "%s, what a nice new member. Why don't you run /g discord & !help here while you're at it :P",
  'Psst %s. You just joined. Do /g discord and !help here :D',
  '%s since you are a member now, do !e and /g discord',
  "Can we take a moment to applaud %s for joining us. Don't forget to do /g discord :3",
  '%s joined the guild. What a legend. Do /g discord',
  'Hey %s and welcome to the guild! Run /g discord',
  '%s nice, new member! Do /g discord to join our community (*・‿・)ノ⌒*:･ﾟ✧'
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
      if (event.eventType === EventType.JOIN) {
        assert(event.username)
        let message = JoinMessages[Math.floor(Math.random() * JoinMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }

      if (event.eventType === EventType.LEAVE) {
        assert(event.username)
        let message = LeaveMessages[Math.floor(Math.random() * LeaveMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }

      if (event.eventType === EventType.KICK) {
        assert(event.username)
        let message = KickMessages[Math.floor(Math.random() * KickMessages.length)]
        message = message.replaceAll('%s', event.username)
        context.application.clusterHelper.sendCommandToAllMinecraft(`/gc ${message}`)
      }
    })
  }
} satisfies PluginInterface
