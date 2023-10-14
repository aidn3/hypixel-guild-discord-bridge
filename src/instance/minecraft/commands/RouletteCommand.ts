import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

const LossMessages = [
  '%s you got blasted!',
  '%s unlucky, wrong choice.',
  "%s it's not rigged, I promise!",
  '%s you got capped.',
  '%s enjoy the mute, haha!',
  '%s better luck next time. Or not...'
]

const WinMessages = [
  '%s you survived?!',
  '%s, lucky. Do it again!',
  '%s? Alive? shame.',
  "%s, I'll get you next time",
  '%s, perhaps I forgot to load it?',
  "%s you're crazy. Again again again!"
]

export default {
  triggers: ['rr', 'roulette'],
  enabled: true,

  handler: async function (context: ChatCommandContext): Promise<string> {
    // chance upped from 1/6 to 2/11.
    // Losing was too rare. Some even managed to reach 18 win streak.
    const chance = 2 / 11

    if (Math.random() < chance) {
      await context.clientInstance.send(`/g mute ${context.username} 15m`)
      context.clientInstance.app.punishedUsers.mute(context.username, 900)

      return LossMessages[Math.floor(Math.random() * LossMessages.length)].replaceAll('%s', context.username)
    }

    return WinMessages[Math.floor(Math.random() * WinMessages.length)].replaceAll('%s', context.username)
  }
} satisfies ChatCommandHandler
