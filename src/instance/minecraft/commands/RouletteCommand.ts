import { MinecraftCommandMessage } from '../common/ChatInterface'
import MinecraftInstance from '../MinecraftInstance'

const LossMessages = [
  'you got blasted!',
  'unlucky, wrong choice.',
  "it's not rigged, I promise!",
  'you got capped.',
  'enjoy the mute, haha!',
  'better luck next time. Or not...'
]

const WinMessages = [
  'you survived?!',
  'lucky. Do it again!',
  'alive? shame.',
  "I'll get you next time",
  'perhaps i forgot to load it?',
  "you're crazy. Again again again!"
]

export default {
  triggers: ['rr', 'roulette'],
  enabled: true,

  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const choice = Number(args[0])

    if (choice < 1 || choice > 6) {
      return `a revolver only has 6 bullets.`
    }

    const random = Math.floor(Math.random() * 6 + 1)

    if (choice === random) {
      await clientInstance.send(`/gc mute ${username} 15m`)
      clientInstance.app.punishedUsers.mute(username, 900)

      return LossMessages[Math.floor(Math.random() * LossMessages.length)]
    }

    return WinMessages[Math.floor(Math.random() * WinMessages.length)]
  }
} satisfies MinecraftCommandMessage
